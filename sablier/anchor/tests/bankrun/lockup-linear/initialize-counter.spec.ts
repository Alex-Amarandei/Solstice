import { Program, setProvider } from '@coral-xyz/anchor';
import { SYSTEM_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/native/system';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { Sablier } from '@project/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { BankrunProvider } from 'anchor-bankrun';
import { ProgramTestContext, startAnchor } from 'solana-bankrun';
import IDL from '../../../target/idl/sablier.json';
import { TIMEOUT } from '../constants';
import { getTeamKeyPair } from '../stream-utils';

//* INFO: This test has a custom setup, that's why it is not reusing the setup function from the other tests
describe('Lockup Linear Stream - Initialize Counter Test', () => {
	let context: ProgramTestContext;
	let provider: BankrunProvider;
	let program: Program<Sablier>;
	let teamKeypair: Keypair;

	const unauthorizedKeypair = Keypair.generate();

	beforeAll(async () => {
		teamKeypair = await getTeamKeyPair();

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

	//* Order is intentionally like this such that the counter is not yet created
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

	//* Counter is being created in this test
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
					.rpc({
						// Needed to ensure that the blockchain does not think the transaction is a duplicate
						commitment: 'confirmed',
					});
				expect(tx).toBeDefined();
			},
			TIMEOUT
		);
	});

	//* Order is intentionally like this such that the counter has been created
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
