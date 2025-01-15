import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { BankrunProvider } from 'anchor-bankrun';
import { BanksClient, ProgramTestContext, startAnchor } from 'solana-bankrun';
import { createAssociatedTokenAccount, createMint, mintTo } from 'spl-token-bankrun';

import { BN, setProvider } from '@coral-xyz/anchor';
import { SYSTEM_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/native/system';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { ASSOCIATED_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token';
import { Sablier } from '@project/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import IDL from '../target/idl/sablier.json';

describe('Lockup Linear Stream Test', () => {
	const streamName = 'testStream'; // Name for the test stream

	let sender: Keypair;
	let recipient: Keypair;

	let banksClient: BanksClient;
	let context: ProgramTestContext;
	let program: Program<Sablier>;
	let provider: BankrunProvider;

	let mint: PublicKey; // Token mint address
	let recipientProvider: BankrunProvider;
	let lockupLinearStream: PublicKey;
	let senderTokenAccount: PublicKey;
	let streamCounter: PublicKey;
	let treasuryTokenAccount: PublicKey;

	beforeAll(async () => {
		// Generate recipient keypair
		recipient = Keypair.generate();

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
					address: recipient.publicKey,
					info: {
						lamports: 1_000_000_000, // Fund recipient with SOL for testing
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

		// Get sender wallet
		sender = provider.wallet.payer;

		// Create token mint and associated token accounts
		// @ts-expect-error - Type error in spl-token-bankrun dependency
		mint = await createMint(banksClient, sender, sender.publicKey, null, 6); // Mint with 6 decimals
		// @ts-expect-error - Type error in spl-token-bankrun dependency
		senderTokenAccount = await createAssociatedTokenAccount(banksClient, sender, mint, sender.publicKey);

		// Initialize recipient provider for testing
		recipientProvider = new BankrunProvider(context);
		recipientProvider.wallet = new NodeWallet(recipient);

		// Derive PDAs for stream counter, stream, and treasury token account
		[streamCounter] = PublicKey.findProgramAddressSync([Buffer.from('LLStreamCounter')], program.programId);

		[lockupLinearStream] = PublicKey.findProgramAddressSync(
			[Buffer.from('LLStream'), sender.publicKey.toBuffer(), mint.toBuffer(), new BN(0).toArrayLike(Buffer, 'le', 8)],
			program.programId
		);

		[treasuryTokenAccount] = PublicKey.findProgramAddressSync(
			[Buffer.from('Treasury'), sender.publicKey.toBuffer(), new BN(0).toArrayLike(Buffer, 'le', 8)],
			program.programId
		);

		// Initialize the stream counter
		await program.methods
			.initializeStreamCounter()
			.accounts({
				sender: sender.publicKey,
			})
			.signers([sender])
			.rpc();

		// Mint tokens to sender's token account for testing
		// @ts-expect-error - Type error in spl-token-bankrun dependency
		await mintTo(banksClient, sender, mint, senderTokenAccount, sender, 1_000_000_000);
	});

	it('should create a lockup linear stream', async () => {
		// Define stream parameters
		const startTime = Math.floor(Date.now() / 1000) + 60; // Start in 1 minute
		const endTime = startTime + 3600; // End in 1 hour
		const cliffTime = startTime + 1800; // Cliff in 30 minutes
		const amount = new BN(1_000_000); // Amount to lock in stream (1M tokens)
		const isCancelable = true; // Allow cancelation
		const isTransferable = true; // Allow transferability

		// Send the createStream transaction
		const tx = await program.methods
			.createStream(
				streamName,
				recipient.publicKey,
				amount,
				new BN(startTime),
				new BN(endTime),
				new BN(cliffTime),
				isCancelable,
				isTransferable
			)
			.accountsStrict({
				sender: sender.publicKey,
				tokenMint: mint,
				senderTokenAccount,
				treasuryTokenAccount,
				streamCounter,
				lockupLinearStream,
				associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
				tokenProgram: TOKEN_PROGRAM_ID,
				systemProgram: SYSTEM_PROGRAM_ID,
			})
			.signers([sender])
			.rpc({
				commitment: 'confirmed',
			});

		// Log transaction signature
		console.log('Transaction successful, signature:', tx);

		// Verify the derived PDA for the stream
		const [derivedPda] = PublicKey.findProgramAddressSync(
			[Buffer.from('LLStream'), sender.publicKey.toBuffer(), mint.toBuffer(), new BN(0).toArrayLike(Buffer, 'le', 8)],
			program.programId
		);

		console.log('Derived PDA:', derivedPda.toBase58());

		// Fetch and log the LockupLinearStream account data
		const streamData = await program.account.lockupLinearStream.fetch(derivedPda);
		console.log('Lockup Linear Stream Data:', streamData);

		// Assertions to verify that all fields in the stream are properly populated
		expect(streamData.id).toBe('LL-0');
		expect(streamData.sender.toBase58()).toBe(sender.publicKey.toBase58());
		expect(streamData.recipient.toBase58()).toBe(recipient.publicKey.toBase58());
		expect(streamData.tokenMint.toBase58()).toBe(mint.toBase58());
		expect(streamData.amounts.deposited.toString()).toBe(amount.toString());
		expect(streamData.amounts.refunded.toString()).toBe('0');
		expect(streamData.amounts.withdrawn.toString()).toBe('0');
		expect(streamData.milestones.startTime.toString()).toBe(startTime.toString());
		expect(streamData.milestones.cliffTime.toString()).toBe(cliffTime.toString());
		expect(streamData.milestones.endTime.toString()).toBe(endTime.toString());
		expect(streamData.isCancelable).toBe(isCancelable);
		expect(streamData.isTransferable).toBe(isTransferable);
	});
});
