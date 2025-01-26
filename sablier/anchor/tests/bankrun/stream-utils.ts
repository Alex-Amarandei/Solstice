import { BN, Program, setProvider } from '@coral-xyz/anchor';
import { SYSTEM_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/native/system';
import { Sablier } from '@project/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { BankrunProvider } from 'anchor-bankrun';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { BanksClient, ProgramTestContext, startAnchor } from 'solana-bankrun';
import { createAssociatedTokenAccount, createMint, mintTo } from 'spl-token-bankrun';
import IDL from '../../target/idl/sablier.json';

dotenv.config({ path: __dirname + '/../.env' });

export const now = () => Math.floor(Date.now() / 1000);

export const getStreamCounterIndexWithSeed = async (program: Program<Sablier>, seed: String) => {
	const [streamCounter] = PublicKey.findProgramAddressSync([Buffer.from(seed)], program.programId);
	const streamCounterData = await program.account.streamCounter.fetch(streamCounter);

	return streamCounterData.streamIndex.toNumber();
};

export const getTreasuryTokenAccountWithSeeds = async (
	tokenMint: PublicKey,
	program: Program<Sablier>,
	treasurySeed: String,
	counterSeed: String
) => {
	const streamCounterIndex = await getStreamCounterIndexWithSeed(program, counterSeed);

	return PublicKey.findProgramAddressSync(
		[Buffer.from(treasurySeed), tokenMint.toBuffer(), new BN(streamCounterIndex).toArrayLike(Buffer, 'le', 8)],
		program.programId
	);
};

export const getTeamKeyPair = async () => {
	const keypairPath = process.env.KEYPAIR_PATH;
	if (!keypairPath) {
		throw new Error('Missing KEYPAIR_PATH in .env');
	}

	const secret = JSON.parse(readFileSync(keypairPath, 'utf-8'));

	return Keypair.fromSecretKey(new Uint8Array(secret));
};

export const environmentSetup = async (seed: String) => {
	let banksClient: BanksClient;
	let context: ProgramTestContext;
	let program: Program<Sablier>;
	let provider: BankrunProvider;

	let alice: Keypair;
	let aliceTokenAccount: PublicKey;

	let bob: Keypair;

	let tokenMint: PublicKey;

	let streamCounter: PublicKey;

	const teamKeypair = await getTeamKeyPair();

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
	tokenMint = await createMint(banksClient, alice, alice.publicKey, null, 9); // Mint with 9 decimals

	// @ts-expect-error - Type error in spl-token-bankrun dependency
	aliceTokenAccount = await createAssociatedTokenAccount(banksClient, alice, tokenMint, alice.publicKey);

	[streamCounter] = PublicKey.findProgramAddressSync([Buffer.from(seed)], program.programId);

	// Mint tokens to Alice's token account for testing
	// @ts-expect-error - Type error in spl-token-bankrun dependency
	await mintTo(banksClient, alice, tokenMint, aliceTokenAccount, alice, 1_000_000_000_000);

	// Initialize the LockupLinearStreamCounter once
	const tx = await program.methods
		.initializeLockupLinearStreamCounter()
		.accounts({
			sender: teamKeypair.publicKey,
		})
		.signers([teamKeypair])
		.rpc();

	expect(tx).toBeDefined();

	return {
		alice,
		aliceTokenAccount,
		banksClient,
		bob,
		context,
		tokenMint,
		program,
		provider,
		streamCounter,
		teamKeypair,
	};
};
