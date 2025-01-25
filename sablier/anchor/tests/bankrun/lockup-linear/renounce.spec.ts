import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { BanksClient, ProgramTestContext } from 'solana-bankrun';

import { Sablier } from '@project/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { timeTravelFor } from '../bankrun-utils';
import { TIMEOUT } from '../constants';
import { beforeAllSetup, createStream } from './setup';
import { getTreasuryTokenAccount } from './utils';

describe('Lockup Linear Stream - Renounce Test', () => {
	let banksClient: BanksClient;
	let context: ProgramTestContext;
	let program: Program<Sablier>;

	let alice: Keypair;
	let bob: Keypair;

	let mint: PublicKey;

	beforeAll(async () => {
		({ alice, banksClient, bob, context, mint, program } = await beforeAllSetup());
	}, TIMEOUT);

	describe('Lockup Linear Stream - Renounce - Happy Flow', () => {
		it(
			'should renounce cancelability for a cancelable stream',
			async () => {
				const [cancelableLockupLinearStream] = await createStream(alice, bob, mint, program);

				// Renounce cancelability for the stream
				const renounceCancelableStreamTx = await program.methods
					.renounceCancelabilityLockupLinearStream()
					.accounts({
						sender: alice.publicKey,
						stream: cancelableLockupLinearStream,
					})
					.signers([alice])
					.rpc();
				expect(renounceCancelableStreamTx).toBeDefined();

				// Fetch and log the LockupLinearStream account data
				const streamData = await program.account.lockupLinearStream.fetch(cancelableLockupLinearStream);

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
				const [cancelableLockupLinearStream] = await createStream(alice, bob, mint, program);

				// Renounce cancelability for the stream
				await expect(
					program.methods
						.renounceCancelabilityLockupLinearStream()
						.accounts({
							sender: bob.publicKey,
							stream: cancelableLockupLinearStream,
						})
						.signers([bob])
						.rpc()
				).rejects.toThrow(/Only the Stream's Creator can renounce the Stream's cancelability./);
			},
			TIMEOUT
		);

		it(
			'should fail if the stream is already canceled',
			async () => {
				const [treasuryTokenAccount] = await getTreasuryTokenAccount(mint, program);
				const [canceledLockupLinearStream] = await createStream(alice, bob, mint, program);

				// Send the cancelStream transaction
				const cancelLockupLinearStreamTx = await program.methods
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
				expect(cancelLockupLinearStreamTx).toBeDefined();

				// Fetch and log the LockupLinearStream account data
				const streamData = await program.account.lockupLinearStream.fetch(canceledLockupLinearStream);

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
				const [notCancelableLockupLinearStream] = await createStream(alice, bob, mint, program, { isCancelable: false });

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
				const startTime = Math.floor(Date.now() / 1000) + 10;
				const [endedLockupLinearStream] = await createStream(alice, bob, mint, program, {
					startTime, // Start in 10 seconds
					endTime: startTime + 5, // 5-second duration
					cliffTime: startTime, // No cliff
				});

				// Wait for the stream to end
				timeTravelFor(3600, banksClient, context);

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
