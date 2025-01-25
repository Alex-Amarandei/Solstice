import { BN, Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { BankrunProvider } from 'anchor-bankrun';
import * as dotenv from 'dotenv';
import { BanksClient, Clock, ProgramTestContext, startAnchor } from 'solana-bankrun';
import { createAssociatedTokenAccount, createMint, mintTo } from 'spl-token-bankrun';

import { setProvider } from '@coral-xyz/anchor';
import { SYSTEM_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/native/system';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { Sablier } from '@project/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import IDL from '../../../target/idl/sablier.json';
import { getTokenBalanceFor, TIMEOUT } from '../../utils';

dotenv.config({ path: __dirname + '/../../.env' });

//! TODO: Refactor code and extract common setup functions and assertions
describe('Lockup Linear Stream - Cancel Test', () => {
	let teamKeypair: Keypair;
	let alice: Keypair;
	let bob: Keypair;

	let banksClient: BanksClient;
	let context: ProgramTestContext;
	let program: Program<Sablier>;
	let provider: BankrunProvider;

	let mint: PublicKey;
	let bobProvider: BankrunProvider;
	let aliceTokenAccount: PublicKey;
	let streamCounter: PublicKey;

	let cancelableLockupLinearStream: PublicKey;
	let canceledLockupLinearStream: PublicKey;
	let notCancelableLockupLinearStream: PublicKey;
	let endedLockupLinearStream: PublicKey;

	const streamName = 'testCancelStream';

	beforeAll(async () => {
		const keypairPath = process.env.KEYPAIR_PATH;
		if (!keypairPath) {
			throw new Error('Missing KEYPAIR_PATH in .env');
		}

		const secret = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
		teamKeypair = Keypair.fromSecretKey(new Uint8Array(secret));

		// Generate Bob keypair
		bob = Keypair.generate();

		// Initialize Anchor test context
		context = await startAnchor(
			'',
			[
				{
					name: 'sablier',
					programId: new PublicKey(IDL.address),
				},
			],
			[
				{
					address: teamKeypair.publicKey,
					info: {
						lamports: 10_000_000_000,
						data: Buffer.alloc(0),
						owner: SYSTEM_PROGRAM_ID,
						executable: false,
					},
				},
				{
					address: bob.publicKey,
					info: {
						lamports: 10_000_000_000,
						data: Buffer.alloc(0),
						owner: SYSTEM_PROGRAM_ID,
						executable: false,
					},
				},
			]
		);

		// Set up Bankrun provider and program
		provider = new BankrunProvider(context);
		setProvider(provider);
		program = new Program(IDL as Sablier, provider);
		banksClient = context.banksClient;

		// Use Alice's wallet for transactions
		alice = provider.wallet.payer;

		// Create token mint and associated token accounts
		// @ts-expect-error - Type error in spl-token-bankrun dependency
		mint = await createMint(banksClient, alice, alice.publicKey, null, 9); // Mint with 9 decimals
		// @ts-expect-error - Type error in spl-token-bankrun dependency
		aliceTokenAccount = await createAssociatedTokenAccount(banksClient, alice, mint, alice.publicKey);

		// Initialize Bob provider for testing
		bobProvider = new BankrunProvider(context);
		bobProvider.wallet = new NodeWallet(bob);

		[streamCounter] = PublicKey.findProgramAddressSync([Buffer.from('LockupLinearStreamCounter')], program.programId);

		// Mint tokens to Alice's token account for testing
		// @ts-expect-error - Type error in spl-token-bankrun dependency
		await mintTo(banksClient, alice, mint, aliceTokenAccount, alice, 1_000_000_000_000);

		// Initialize the LockupLinearStreamCounter once
		const tx = await program.methods
			.initializeLockupLinearStreamCounter()
			.accounts({
				sender: teamKeypair.publicKey,
			})
			.signers([teamKeypair])
			.rpc();

		expect(tx).toBeDefined();
	}, TIMEOUT);

	describe('Lockup Linear Stream - Cancel - Happy Flow', () => {
		it(
			'should fully refund a stream if canceled before the cliff',
			async () => {
				const startTime = Math.floor(Date.now() / 1000) + 5;
				const endTime = startTime + 60;
				const cliffTime = startTime + 30;
				const amount = new BN(1000);
				const isCancelable = true;
				const isTransferable = true;

				// Derive new addresses
				const [fullRefundStream] = PublicKey.findProgramAddressSync(
					[Buffer.from('LockupLinearStream'), new BN(0).toArrayLike(Buffer, 'le', 8)],
					program.programId
				);
				const [treasuryTokenAccount] = PublicKey.findProgramAddressSync(
					[Buffer.from('LockupLinearTreasury'), mint.toBuffer(), new BN(0).toArrayLike(Buffer, 'le', 8)],
					program.programId
				);

				// Initial balances
				const aliceInitialBalance = await getTokenBalanceFor(aliceTokenAccount, banksClient);
				console.log('Alice Initial Balance:', aliceInitialBalance.toNumber());

				// Create the stream (move 1000 tokens to treasury)
				await program.methods
					.createLockupLinearStream(
						`${streamName}-full-refund`,
						bob.publicKey,
						amount,
						new BN(startTime),
						new BN(endTime),
						new BN(cliffTime),
						isCancelable,
						isTransferable
					)
					.accounts({
						sender: alice.publicKey,
						tokenMint: mint,
						tokenProgram: TOKEN_PROGRAM_ID,
					})
					.signers([alice])
					.rpc();

				const treasuryBalanceAfterCreation = await getTokenBalanceFor(treasuryTokenAccount, banksClient);
				expect(treasuryBalanceAfterCreation.toNumber()).toBe(1000);

				const aliceBalanceAfterCreation = await getTokenBalanceFor(aliceTokenAccount, banksClient);
				expect(aliceBalanceAfterCreation.toNumber()).toBe(aliceInitialBalance.toNumber() - 1000);

				// Move clock so the stream has started, but hasn't reached cliff yet
				const currentClock = await banksClient.getClock();
				// Jump time to (startTime + 10) => before cliffTime
				context.setClock(
					new Clock(
						currentClock.slot,
						currentClock.epochStartTimestamp,
						currentClock.epoch,
						currentClock.leaderScheduleEpoch,
						BigInt(startTime + 10)
					)
				);

				// Cancel before cliff => full refund
				await program.methods
					.cancelLockupLinearStream()
					.accounts({
						sender: alice.publicKey,
						stream: fullRefundStream,
						tokenMint: mint,
						tokenProgram: TOKEN_PROGRAM_ID,
						treasuryTokenAccount,
					})
					.signers([alice])
					.rpc();

				// Check final balances
				const treasuryBalanceAfterCancelation = await getTokenBalanceFor(treasuryTokenAccount, banksClient);
				expect(treasuryBalanceAfterCancelation.toNumber()).toBe(0);

				const aliceBalanceAfterCancelation = await getTokenBalanceFor(aliceTokenAccount, banksClient);
				expect(aliceBalanceAfterCancelation.toNumber()).toBe(aliceInitialBalance.toNumber());

				// Verify the stream was canceled
				const streamData = await program.account.lockupLinearStream.fetch(fullRefundStream);
				console.log('Canceled Lockup Linear Stream Data:', streamData);

				expect(streamData.baseStream.isCanceled).toBe(true);
				expect(streamData.baseStream.isCancelable).toBe(false);
				expect(streamData.baseStream.amounts.refunded.toNumber()).toEqual(1000);
				expect(streamData.baseStream.amounts.deposited.toNumber()).toEqual(1000);
				expect(streamData.baseStream.amounts.withdrawn.toNumber()).toEqual(0);
			},
			TIMEOUT
		);

		it(
			'should partially refund a stream if canceled after the cliff but before the end time',
			async () => {
				const startTime = Math.floor(Date.now() / 1000) + 5;
				const endTime = startTime + 60;
				const cliffTime = startTime + 10;
				const amount = new BN(1000);
				const isCancelable = true;
				const isTransferable = true;

				const [partialRefundStream] = PublicKey.findProgramAddressSync(
					[Buffer.from('LockupLinearStream'), new BN(1).toArrayLike(Buffer, 'le', 8)],
					program.programId
				);
				const [treasuryTokenAccount] = PublicKey.findProgramAddressSync(
					[Buffer.from('LockupLinearTreasury'), mint.toBuffer(), new BN(1).toArrayLike(Buffer, 'le', 8)],
					program.programId
				);

				// Store initial balances
				const aliceBalanceBeforeCreation = await getTokenBalanceFor(aliceTokenAccount, banksClient);

				// Create the stream
				await program.methods
					.createLockupLinearStream(
						`${streamName}-partial-refund`,
						bob.publicKey,
						amount,
						new BN(startTime),
						new BN(endTime),
						new BN(cliffTime),
						isCancelable,
						isTransferable
					)
					.accounts({
						sender: alice.publicKey,
						tokenMint: mint,
						tokenProgram: TOKEN_PROGRAM_ID,
					})
					.signers([alice])
					.rpc();

				const treasuryBalanceAfterCreation = await getTokenBalanceFor(treasuryTokenAccount, banksClient);
				expect(treasuryBalanceAfterCreation.toNumber()).toBe(1000);

				const aliceBalanceAfterCreation = await getTokenBalanceFor(aliceTokenAccount, banksClient);
				expect(aliceBalanceAfterCreation.toNumber()).toBe(aliceBalanceBeforeCreation.toNumber() - 1000);

				// Advance clock so that we are after cliff but still before end
				// Jump to ~30s after start, which is >10s but <60s
				const currentClock = await banksClient.getClock();
				const newTime = BigInt(startTime + 30);
				context.setClock(
					new Clock(
						currentClock.slot,
						currentClock.epochStartTimestamp,
						currentClock.epoch,
						currentClock.leaderScheduleEpoch,
						newTime
					)
				);

				// Cancel the stream
				await program.methods
					.cancelLockupLinearStream()
					.accounts({
						sender: alice.publicKey,
						stream: partialRefundStream,
						tokenMint: mint,
						tokenProgram: TOKEN_PROGRAM_ID,
						treasuryTokenAccount,
					})
					.signers([alice])
					.rpc();

				const treasuryBalanceAfterCancelation = await getTokenBalanceFor(treasuryTokenAccount, banksClient);
				expect(treasuryBalanceAfterCancelation.toNumber()).toBe(500);

				const aliceBalanceAfterCancelation = await getTokenBalanceFor(aliceTokenAccount, banksClient);
				expect(aliceBalanceAfterCancelation.toNumber()).toBe(aliceBalanceAfterCreation.toNumber() + 500);

				// Verify the stream was canceled
				const streamData = await program.account.lockupLinearStream.fetch(partialRefundStream);
				console.log('Canceled Lockup Linear Stream Data:', streamData);

				expect(streamData.baseStream.isCanceled).toBe(true);
				expect(streamData.baseStream.isCancelable).toBe(false);
				expect(streamData.baseStream.amounts.refunded.toNumber()).toEqual(500);
				expect(streamData.baseStream.amounts.deposited.toNumber()).toEqual(1000);
				expect(streamData.baseStream.amounts.withdrawn.toNumber()).toEqual(0);
			},
			TIMEOUT
		);
	});

	describe('Lockup Linear Stream - Cancel - Error Flow', () => {
		it(
			"should fail if the sender is not the stream's creator",
			async () => {
				const startTime = Math.floor(Date.now() / 1000) + 30;
				const endTime = startTime + 600;
				const cliffTime = startTime + 300;
				const amount = new BN(1_000);
				const isCancelable = true;
				const isTransferable = true;

				[cancelableLockupLinearStream] = PublicKey.findProgramAddressSync(
					[Buffer.from('LockupLinearStream'), new BN(2).toArrayLike(Buffer, 'le', 8)],
					program.programId
				);

				const createCancelableStreamTx = await program.methods
					.createLockupLinearStream(
						streamName,
						bob.publicKey,
						amount,
						new BN(startTime),
						new BN(endTime),
						new BN(cliffTime),
						isCancelable,
						isTransferable
					)
					.accounts({
						sender: alice.publicKey,
						tokenMint: mint,
						tokenProgram: TOKEN_PROGRAM_ID,
					})
					.signers([alice])
					.rpc();
				expect(createCancelableStreamTx).toBeDefined();

				const [treasuryTokenAccount] = PublicKey.findProgramAddressSync(
					[Buffer.from('LockupLinearTreasury'), mint.toBuffer(), new BN(2).toArrayLike(Buffer, 'le', 8)],
					program.programId
				);

				// Attempt cancellation as Bob
				// @ts-expect-error - Type error in spl-token-bankrun dependency
				await createAssociatedTokenAccount(banksClient, bob, mint, bob.publicKey);

				await expect(
					program.methods
						.cancelLockupLinearStream()
						.accounts({
							sender: bob.publicKey,
							stream: cancelableLockupLinearStream,
							tokenMint: mint,
							tokenProgram: TOKEN_PROGRAM_ID,
							treasuryTokenAccount,
						})
						.signers([bob])
						.rpc()
				).rejects.toThrow(/Only the Stream's Creator can cancel the Stream./);
			},
			TIMEOUT
		);

		it(
			'should fail if the stream is already canceled',
			async () => {
				const startTime = Math.floor(Date.now() / 1000) + 30;
				const endTime = startTime + 600;
				const cliffTime = startTime + 300;
				const amount = new BN(1_000);
				const isCancelable = true;
				const isTransferable = true;

				[canceledLockupLinearStream] = PublicKey.findProgramAddressSync(
					[Buffer.from('LockupLinearStream'), new BN(3).toArrayLike(Buffer, 'le', 8)],
					program.programId
				);

				const createCancelableStreamTx = await program.methods
					.createLockupLinearStream(
						streamName,
						bob.publicKey,
						amount,
						new BN(startTime),
						new BN(endTime),
						new BN(cliffTime),
						isCancelable,
						isTransferable
					)
					.accounts({
						sender: alice.publicKey,
						tokenMint: mint,
						tokenProgram: TOKEN_PROGRAM_ID,
					})
					.signers([alice])
					.rpc();
				expect(createCancelableStreamTx).toBeDefined();

				const [treasuryTokenAccount] = PublicKey.findProgramAddressSync(
					[Buffer.from('LockupLinearTreasury'), mint.toBuffer(), new BN(3).toArrayLike(Buffer, 'le', 8)],
					program.programId
				);

				// Cancel once
				await program.methods
					.cancelLockupLinearStream()
					.accounts({
						sender: alice.publicKey,
						stream: canceledLockupLinearStream,
						tokenMint: mint,
						tokenProgram: TOKEN_PROGRAM_ID,
						treasuryTokenAccount,
					})
					.signers([alice])
					.rpc({
						commitment: 'confirmed',
					});

				// Attempt to cancel again
				await expect(
					program.methods
						.cancelLockupLinearStream()
						.accounts({
							sender: alice.publicKey,
							stream: canceledLockupLinearStream,
							tokenMint: mint,
							tokenProgram: TOKEN_PROGRAM_ID,
							treasuryTokenAccount,
						})
						.signers([alice])
						.rpc()
				).rejects.toThrow(/Stream is already canceled/);
			},
			TIMEOUT
		);

		it(
			'should fail if the stream is not cancelable',
			async () => {
				const startTime = Math.floor(Date.now() / 1000) + 30;
				const endTime = startTime + 600;
				const cliffTime = startTime + 300;
				const amount = new BN(1_000);
				const isCancelable = false;
				const isTransferable = true;

				[notCancelableLockupLinearStream] = PublicKey.findProgramAddressSync(
					[Buffer.from('LockupLinearStream'), new BN(4).toArrayLike(Buffer, 'le', 8)],
					program.programId
				);

				const createNotCancelableStreamTx = await program.methods
					.createLockupLinearStream(
						streamName,
						bob.publicKey,
						amount,
						new BN(startTime),
						new BN(endTime),
						new BN(cliffTime),
						isCancelable,
						isTransferable
					)
					.accounts({
						sender: alice.publicKey,
						tokenMint: mint,
						tokenProgram: TOKEN_PROGRAM_ID,
					})
					.signers([alice])
					.rpc();
				expect(createNotCancelableStreamTx).toBeDefined();

				const [treasuryTokenAccount] = PublicKey.findProgramAddressSync(
					[Buffer.from('LockupLinearTreasury'), mint.toBuffer(), new BN(4).toArrayLike(Buffer, 'le', 8)],
					program.programId
				);

				// Attempt to cancel a non-cancelable stream
				await expect(
					program.methods
						.cancelLockupLinearStream()
						.accounts({
							sender: alice.publicKey,
							stream: notCancelableLockupLinearStream,
							tokenMint: mint,
							tokenProgram: TOKEN_PROGRAM_ID,
							treasuryTokenAccount,
						})
						.signers([alice])
						.rpc()
				).rejects.toThrow(/Stream is not cancelable/);
			},
			TIMEOUT
		);

		it(
			'should fail if the stream has already ended',
			async () => {
				const startTime = Math.floor(Date.now() / 1000) + 5;
				const endTime = startTime + 5; // ends quickly
				const cliffTime = startTime; // no real cliff
				const amount = new BN(1_000);
				const isCancelable = true;
				const isTransferable = true;

				[endedLockupLinearStream] = PublicKey.findProgramAddressSync(
					[Buffer.from('LockupLinearStream'), new BN(5).toArrayLike(Buffer, 'le', 8)],
					program.programId
				);

				const createStreamTx = await program.methods
					.createLockupLinearStream(
						streamName,
						bob.publicKey,
						amount,
						new BN(startTime),
						new BN(endTime),
						new BN(cliffTime),
						isCancelable,
						isTransferable
					)
					.accounts({
						sender: alice.publicKey,
						tokenMint: mint,
						tokenProgram: TOKEN_PROGRAM_ID,
					})
					.signers([alice])
					.rpc();
				expect(createStreamTx).toBeDefined();

				// Advance time so the stream ends
				const currentClock = await banksClient.getClock();
				context.setClock(
					new Clock(
						currentClock.slot,
						currentClock.epochStartTimestamp,
						currentClock.epoch,
						currentClock.leaderScheduleEpoch,
						BigInt(startTime + 1000) // well past endTime
					)
				);

				const [treasuryTokenAccount] = PublicKey.findProgramAddressSync(
					[Buffer.from('LockupLinearTreasury'), mint.toBuffer(), new BN(5).toArrayLike(Buffer, 'le', 8)],
					program.programId
				);

				// Attempt to cancel an ended stream
				await expect(
					program.methods
						.cancelLockupLinearStream()
						.accounts({
							sender: alice.publicKey,
							stream: endedLockupLinearStream,
							tokenMint: mint,
							tokenProgram: TOKEN_PROGRAM_ID,
							treasuryTokenAccount,
						})
						.signers([alice])
						.rpc()
				).rejects.toThrow(/Stream is not cancelable after the end time has passed/);
			},
			TIMEOUT
		);
	});

	afterEach(async () => {
		const currentClock = await banksClient.getClock();
		const systemClock = Math.floor(Date.now() / 1000);

		context.setClock(
			new Clock(
				currentClock.slot,
				currentClock.epochStartTimestamp,
				currentClock.epoch,
				currentClock.leaderScheduleEpoch,
				BigInt(systemClock)
			)
		);
	});
});
