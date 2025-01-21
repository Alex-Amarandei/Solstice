import { Program, setProvider } from '@coral-xyz/anchor';
import { SYSTEM_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/native/system';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { Sablier } from '@project/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { BankrunProvider } from 'anchor-bankrun';
import { TIMEOUT } from 'anchor/tests/utils';
import * as dotenv from 'dotenv';
import fs from 'fs';
import { startAnchor } from 'solana-bankrun';
import IDL from '../../../target/idl/sablier.json';

dotenv.config({ path: __dirname + '/../../.env' });

describe('Lockup Linear Stream Counter Tests', () => {
	let context: any;
	let provider: BankrunProvider;
	let program: Program<Sablier>;
	let teamKeypair: Keypair;

	const unauthorizedKeypair = Keypair.generate();

	beforeAll(async () => {
		const keypairPath = process.env.KEYPAIR_PATH;
		if (!keypairPath) {
			throw new Error('Missing KEYPAIR_PATH in .env');
		}

		const secret = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
		teamKeypair = Keypair.fromSecretKey(new Uint8Array(secret));

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
					address: unauthorizedKeypair.publicKey,
					info: {
						lamports: 10_000_000_000,
						data: Buffer.alloc(0),
						owner: SYSTEM_PROGRAM_ID,
						executable: false,
					},
				},
			]
		);

		provider = new BankrunProvider(context, new NodeWallet(teamKeypair));
		setProvider(provider);
		program = new Program(IDL as Sablier, provider);
	}, TIMEOUT);

	// Order is intentionally like this such that the counter is not yet created
	describe('Lockup Linear Stream Counter - Error Flow - 1', () => {
		it(
			'should throw an error if the creator is unauthorized',
			async () => {
				await expect(
					program.methods
						.initializeLockupLinearStreamCounter()
						.accounts({
							sender: unauthorizedKeypair.publicKey,
						})
						.signers([unauthorizedKeypair])
						.rpc()
				).rejects.toThrow(/Stream Counter creator is unauthorized/);
			},
			TIMEOUT
		);
	});

	describe('Lockup Linear Stream Counter - Happy Flow', () => {
		it(
			'should initialize the Lockup Linear Stream Counter',
			async () => {
				const tx = await program.methods
					.initializeLockupLinearStreamCounter()
					.accounts({
						sender: provider.wallet.publicKey,
					})
					.signers([teamKeypair])
					.rpc();

				expect(tx).toBeDefined();

				const [pda] = PublicKey.findProgramAddressSync([Buffer.from('LockupLinearStreamCounter')], program.programId);
				const counterData = await program.account.streamCounter.fetch(pda);
				expect(counterData).toBeDefined();
			},
			TIMEOUT
		);
	});

	// Order is intentionally like this such that the counter has been created
	describe('Lockup Linear Stream Counter - Error Flow - 2', () => {
		it(
			'should throw an error if already initialized',
			async () => {
				await expect(
					program.methods
						.initializeLockupLinearStreamCounter()
						.accounts({
							sender: provider.wallet.publicKey,
						})
						.signers([teamKeypair])
						.rpc()
				).rejects.toThrow(/already in use/);
			},
			TIMEOUT
		);
	});
});
