import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { BankrunProvider } from 'anchor-bankrun';
import * as dotenv from 'dotenv';
import { BanksClient, ProgramTestContext, startAnchor } from 'solana-bankrun';
import { createAssociatedTokenAccount, createMint, mintTo } from 'spl-token-bankrun';

import { BN, setProvider } from '@coral-xyz/anchor';
import { SYSTEM_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/native/system';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { Sablier } from '@project/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import IDL from '../../../target/idl/sablier.json';
import { TIMEOUT } from '../../utils';

dotenv.config({ path: __dirname + '/../../.env' });

describe('Lockup Linear Stream - Create Test', () => {
	let teamKeypair: Keypair;
	const streamName = 'testStream';

	let alice: Keypair;
	let bob: Keypair;

	let banksClient: BanksClient;
	let context: ProgramTestContext;
	let program: Program<Sablier>;
	let provider: BankrunProvider;

	let mint: PublicKey;
	let bobProvider: BankrunProvider;
	let lockupLinearStream: PublicKey;
	let aliceTokenAccount: PublicKey;
	let streamCounter: PublicKey;
	let treasuryTokenAccount: PublicKey;

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

		[lockupLinearStream] = PublicKey.findProgramAddressSync(
			[Buffer.from('LockupLinearStream'), new BN(0).toArrayLike(Buffer, 'le', 8)],
			program.programId
		);

		[treasuryTokenAccount] = PublicKey.findProgramAddressSync(
			[Buffer.from('LockupLinearTreasury'), mint.toBuffer(), new BN(0).toArrayLike(Buffer, 'le', 8)],
			program.programId
		);

		// Mint tokens to Alice's token account for testing
		// @ts-expect-error - Type error in spl-token-bankrun dependency
		await mintTo(banksClient, alice, mint, aliceTokenAccount, alice, 1_000_000_000_000);

		const tx = await program.methods
			.initializeLockupLinearStreamCounter()
			.accounts({
				sender: teamKeypair.publicKey,
			})
			.signers([teamKeypair])
			.rpc();

		expect(tx).toBeDefined();
	}, TIMEOUT);

	describe('Lockup Linear Stream - Create - Happy Flow', () => {
		it(
			'should create a lockup linear stream',
			async () => {
				// Define stream parameters
				const startTime = Math.floor(Date.now() / 1000) + 60; // Start in 1 minute
				const endTime = startTime + 3600; // End in 1 hour
				const cliffTime = startTime + 1800; // Cliff in 30 minutes
				const amount = new BN(1_000_000); // Amount to lock in stream (1M tokens)
				const isCancelable = true; // Allow cancelation
				const isTransferable = true; // Allow transferability

				// Send the createStream transaction
				const tx = await program.methods
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

				// Log transaction signature
				console.log('Transaction successful, signature:', tx);

				// Verify the derived PDA for the stream
				const [derivedPda] = PublicKey.findProgramAddressSync(
					[Buffer.from('LockupLinearStream'), new BN(0).toArrayLike(Buffer, 'le', 8)],
					program.programId
				);

				expect(derivedPda.toBase58()).toBe(lockupLinearStream.toBase58());

				// Fetch and log the LockupLinearStream account data
				const streamData = await program.account.lockupLinearStream.fetch(derivedPda);
				console.log('Lockup Linear Stream Data:', streamData);

				// Assertions to verify that all fields in the stream are properly populated
				expect(streamData.baseStream.id).toBe('LL-0');
				expect(streamData.baseStream.sender.toBase58()).toBe(alice.publicKey.toBase58());
				expect(streamData.baseStream.recipient.toBase58()).toBe(bob.publicKey.toBase58());
				expect(streamData.baseStream.tokenMint.toBase58()).toBe(mint.toBase58());
				expect(streamData.baseStream.amounts.deposited.toString()).toBe(amount.toString());
				expect(streamData.baseStream.amounts.refunded.toString()).toBe('0');
				expect(streamData.baseStream.amounts.withdrawn.toString()).toBe('0');
				expect(streamData.baseStream.startTime.toString()).toBe(startTime.toString());
				expect(streamData.cliffTime!.toString()).toBe(cliffTime.toString());
				expect(streamData.baseStream.endTime.toString()).toBe(endTime.toString());
				expect(streamData.baseStream.isCancelable).toBe(isCancelable);
				expect(streamData.baseStream.isCanceled).toBe(false);
				expect(streamData.baseStream.isTransferable).toBe(isTransferable);
			},
			TIMEOUT
		);
	});

	describe('Lockup Linear Stream - Create - Error Flow', () => {
		beforeAll(async () => {
			// Derive new PDAs for stream and treasury token account since the Stream Counter's Stream Index is now 1
			[lockupLinearStream] = PublicKey.findProgramAddressSync(
				[Buffer.from('LockupLinearStream'), new BN(1).toArrayLike(Buffer, 'le', 8)],
				program.programId
			);

			[treasuryTokenAccount] = PublicKey.findProgramAddressSync(
				[Buffer.from('LockupLinearTreasury'), mint.toBuffer(), new BN(1).toArrayLike(Buffer, 'le', 8)],
				program.programId
			);
		});

		it(
			'should fail if start time is in the past',
			async () => {
				const startTime = Math.floor(Date.now() / 1000) - 60; // Start in the past
				const endTime = startTime + 3600; // End in 1 hour
				const cliffTime = startTime + 1800; // Cliff in 30 minutes
				const amount = new BN(1_000_000);
				const isCancelable = true;
				const isTransferable = true;

				await expect(
					program.methods
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
						.rpc()
				).rejects.toThrow(/Start time must not be in the past/);
			},
			TIMEOUT
		);

		it(
			'should fail if start time is after cliff time',
			async () => {
				const startTime = Math.floor(Date.now() / 1000) + 60;
				const cliffTime = startTime - 10; // Cliff before start time
				const endTime = startTime + 3600;
				const amount = new BN(1_000_000);
				const isCancelable = true;
				const isTransferable = true;

				await expect(
					program.methods
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
						.rpc()
				).rejects.toThrow(/Cliff time must be between start and end time/);
			},
			TIMEOUT
		);

		it(
			'should fail if start time is after end time',
			async () => {
				const startTime = Math.floor(Date.now() / 1000) + 60;
				const endTime = startTime - 10; // End before start time
				const cliffTime = startTime + 30;
				const amount = new BN(1_000_000);
				const isCancelable = true;
				const isTransferable = true;

				await expect(
					program.methods
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
						.rpc()
				).rejects.toThrow(/End time must be after start time/);
			},
			TIMEOUT
		);

		it(
			'should fail if amount is zero',
			async () => {
				const startTime = Math.floor(Date.now() / 1000) + 60;
				const endTime = startTime + 3600;
				const cliffTime = startTime + 1800;
				const amount = new BN(0); // Invalid amount
				const isCancelable = true;
				const isTransferable = true;

				await expect(
					program.methods
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
						.rpc()
				).rejects.toThrow(/Amount must be greater than 0/);
			},
			TIMEOUT
		);
	});
});
