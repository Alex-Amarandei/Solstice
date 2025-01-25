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
import { TIMEOUT } from '../../utils';

dotenv.config({ path: __dirname + '/../../.env' });

describe('Lockup Linear Stream - Renounce Test', () => {
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

	let cancelableLockupLinearStream: PublicKey; // A cancelable stream
	let canceledLockupLinearStream: PublicKey; // A stream that is already canceled
	let notCancelableLockupLinearStream: PublicKey; // A stream that is non-cancelable
	let endedLockupLinearStream: PublicKey; // A stream that has already ended

	const streamName = 'testStream';

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

	describe('Lockup Linear Stream - Renounce - Happy Flow', () => {
		it(
			'should renounce cancelability for a cancelable stream',
			async () => {
				const startTime = Math.floor(Date.now() / 1000) + 60; // Start in 1 minute
				const endTime = startTime + 3600; // End in 1 hour
				const cliffTime = startTime + 1800; // Cliff in 30 minutes
				const amount = new BN(1_000); // Amount to lock in stream (1K tokens)
				const isCancelable = true; // Allow cancelation
				const isTransferable = true; // Allow transferability

				[cancelableLockupLinearStream] = PublicKey.findProgramAddressSync(
					[Buffer.from('LockupLinearStream'), new BN(0).toArrayLike(Buffer, 'le', 8)],
					program.programId
				);

				// Send the createStream transaction
				const createCancelableLLStreamTx = await program.methods
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

				expect(createCancelableLLStreamTx).toBeDefined();

				// Renounce cancelability for the stream
				const renounceCancelableStreamTx = await program.methods
					.renounceCancelabilityLockupLinearStream()
					.accountsStrict({
						sender: alice.publicKey,
						stream: cancelableLockupLinearStream,
					})
					.signers([alice])
					.rpc();

				expect(renounceCancelableStreamTx).toBeDefined();

				// Fetch and log the LockupLinearStream account data
				const streamData = await program.account.lockupLinearStream.fetch(cancelableLockupLinearStream);
				console.log('Lockup Linear Stream Data:', streamData);

				// Assertions to verify that all fields in the stream are properly populated
				expect(streamData.baseStream.isCancelable).toBe(false);
				expect(streamData.baseStream.isCanceled).toBe(false);
			},
			TIMEOUT
		);
	});

	describe('Lockup Linear Stream - Renounce - Error Flow', () => {
		it(
			"should fail if the sender is not the stream's creator",
			async () => {
				const startTime = Math.floor(Date.now() / 1000) + 60; // Start in 1 minute
				const endTime = startTime + 3600; // End in 1 hour
				const cliffTime = startTime + 1800; // Cliff in 30 minutes
				const amount = new BN(1_000); // Amount to lock in stream (1K tokens)
				const isCancelable = true; // Allow cancelation
				const isTransferable = true; // Allow transferability

				[cancelableLockupLinearStream] = PublicKey.findProgramAddressSync(
					[Buffer.from('LockupLinearStream'), new BN(1).toArrayLike(Buffer, 'le', 8)],
					program.programId
				);

				// Send the createStream transaction
				const createCancelableLLStreamTx = await program.methods
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

				expect(createCancelableLLStreamTx).toBeDefined();

				// Renounce cancelability for the stream
				await expect(
					program.methods
						.renounceCancelabilityLockupLinearStream()
						.accountsStrict({
							sender: bob.publicKey,
							stream: cancelableLockupLinearStream,
						})
						.signers([bob])
						.rpc()
					// At the moment, the Stream's seeds take into account the sender as well, so the require block is not even reached
				).rejects.toThrow(/Only the Stream's Creator can renounce the Stream's cancelability./);
			},
			TIMEOUT
		);

		it(
			'should fail if the stream is already canceled',
			async () => {
				const startTime = Math.floor(Date.now() / 1000) + 60; // Start in 1 minute
				const endTime = startTime + 3600; // End in 1 hour
				const cliffTime = startTime + 1800; // Cliff in 30 minutes
				const amount = new BN(1_000); // Amount to lock in stream (1K tokens)
				const isCancelable = true; // Allow cancelation
				const isTransferable = true; // Allow transferability

				[canceledLockupLinearStream] = PublicKey.findProgramAddressSync(
					[Buffer.from('LockupLinearStream'), new BN(2).toArrayLike(Buffer, 'le', 8)],
					program.programId
				);

				// Send the createStream transaction
				const createCancelableLLStreamTx = await program.methods
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

				expect(createCancelableLLStreamTx).toBeDefined();

				const [treasuryTokenAccount] = PublicKey.findProgramAddressSync(
					[Buffer.from('LockupLinearTreasury'), mint.toBuffer(), new BN(2).toArrayLike(Buffer, 'le', 8)],
					program.programId
				);

				// Send the cancelStream transaction
				const cancelLLStreamTx = await program.methods
					.cancelLockupLinearStream()
					.accounts({
						sender: alice.publicKey,
						stream: canceledLockupLinearStream,
						tokenMint: mint,
						tokenProgram: TOKEN_PROGRAM_ID,
						treasuryTokenAccount,
					})
					.signers([alice])
					.rpc();

				expect(cancelLLStreamTx).toBeDefined();

				// Fetch and log the LockupLinearStream account data
				const streamData = await program.account.lockupLinearStream.fetch(canceledLockupLinearStream);
				console.log('Lockup Linear Stream Data:', streamData);

				// Assertions to verify that all fields in the stream are properly populated
				expect(streamData.baseStream.isCancelable).toBe(false);
				expect(streamData.baseStream.isCanceled).toBe(true);

				// Renounce cancelability for the stream
				await expect(
					program.methods
						.renounceCancelabilityLockupLinearStream()
						.accounts({
							sender: alice.publicKey,
							stream: canceledLockupLinearStream,
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
				const startTime = Math.floor(Date.now() / 1000) + 60; // Start in 1 minute
				const endTime = startTime + 3600; // End in 1 hour
				const cliffTime = startTime + 1800; // Cliff in 30 minutes
				const amount = new BN(1_000); // Amount to lock in stream (1K tokens)
				const isCancelable = false; // Disable cancelation
				const isTransferable = true; // Allow transferability

				[notCancelableLockupLinearStream] = PublicKey.findProgramAddressSync(
					[Buffer.from('LockupLinearStream'), new BN(3).toArrayLike(Buffer, 'le', 8)],
					program.programId
				);

				// Send the createStream transaction
				const createNotCancelableLLStreamTx = await program.methods
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

				expect(createNotCancelableLLStreamTx).toBeDefined();

				// Renounce cancelability for the stream
				await expect(
					program.methods
						.renounceCancelabilityLockupLinearStream()
						.accounts({
							sender: alice.publicKey,
							stream: notCancelableLockupLinearStream,
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
				const startTime = Math.floor(Date.now() / 1000) + 10; // Start in 10 seconds
				const endTime = startTime + 5; // End in 15 seconds
				const cliffTime = startTime; // No Cliff
				const amount = new BN(1_000); // Amount to lock in stream (1K tokens)
				const isCancelable = true; // Allow cancelation
				const isTransferable = true; // Allow transferability

				[endedLockupLinearStream] = PublicKey.findProgramAddressSync(
					[Buffer.from('LockupLinearStream'), new BN(4).toArrayLike(Buffer, 'le', 8)],
					program.programId
				);

				// Send the createStream transaction
				const createNotCancelableLLStreamTx = await program.methods
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

				expect(createNotCancelableLLStreamTx).toBeDefined();

				// Wait for the stream to end
				const currentClock = await banksClient.getClock();
				context.setClock(
					new Clock(
						currentClock.slot,
						currentClock.epochStartTimestamp,
						currentClock.epoch,
						currentClock.leaderScheduleEpoch,
						BigInt(startTime) + BigInt(3_600)
					)
				);

				// Renounce cancelability for the stream
				await expect(
					program.methods
						.renounceCancelabilityLockupLinearStream()
						.accounts({
							sender: alice.publicKey,
							stream: endedLockupLinearStream,
						})
						.signers([alice])
						.rpc()
				).rejects.toThrow(/Stream cancelability is not renounceable after the end time has passed/);
			},
			TIMEOUT
		);
	});
});
