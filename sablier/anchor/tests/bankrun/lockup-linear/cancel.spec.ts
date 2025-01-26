import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { BanksClient, ProgramTestContext } from 'solana-bankrun';
import { createAssociatedTokenAccount } from 'spl-token-bankrun';

import { Sablier } from '@project/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getTokenBalanceFor, timeTravelFor, timeTravelTo } from '../bankrun-utils';
import { TIMEOUT } from '../constants';
import { now } from '../stream-utils';
import { beforeAllSetup, createStream } from './setup';
import { getTreasuryTokenAccount } from './utils';

describe('Lockup Linear Stream - Cancel Test', () => {
	let banksClient: BanksClient;
	let context: ProgramTestContext;
	let program: Program<Sablier>;

	let alice: Keypair;
	let aliceTokenAccount: PublicKey;

	let bob: Keypair;

	let tokenMint: PublicKey;

	beforeAll(async () => {
		({ alice, aliceTokenAccount, banksClient, bob, context, tokenMint, program } = await beforeAllSetup());
	}, TIMEOUT);

	describe('Lockup Linear Stream - Cancel - Happy Flow', () => {
		it(
			'should fully refund a stream if canceled before the cliff',
			async () => {
				const startTime = now() + 5;
				const amount = 1_000;

				// Initial balances
				const aliceInitialBalance = await getTokenBalanceFor(aliceTokenAccount, banksClient);
				console.log('Alice Initial Balance: ', aliceInitialBalance.toNumber());

				const [treasuryTokenAccount] = await getTreasuryTokenAccount(tokenMint, program);
				const [stream] = await createStream(alice, bob, tokenMint, program, {
					startTime,
					endTime: startTime + 60,
					cliffTime: startTime + 30,
					amount,
				});

				const treasuryBalanceAfterCreation = await getTokenBalanceFor(treasuryTokenAccount, banksClient);
				expect(treasuryBalanceAfterCreation.toNumber()).toBe(amount);

				const aliceBalanceAfterCreation = await getTokenBalanceFor(aliceTokenAccount, banksClient);
				expect(aliceBalanceAfterCreation.toNumber()).toBe(aliceInitialBalance.toNumber() - amount);

				// Move clock so the stream has started, but hasn't reached cliff yet
				timeTravelTo(startTime + 10, banksClient, context);

				// Cancel before cliff => full refund
				await program.methods
					.cancelLockupLinearStream()
					.accounts({
						sender: alice.publicKey,
						stream,
						tokenMint,
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
				const streamData = await program.account.lockupLinearStream.fetch(stream);

				expect(streamData.baseStream.isCanceled).toBe(true);
				expect(streamData.baseStream.isCancelable).toBe(false);
				expect(streamData.baseStream.amounts.refunded.toNumber()).toEqual(amount);
				expect(streamData.baseStream.amounts.deposited.toNumber()).toEqual(amount);
				expect(streamData.baseStream.amounts.withdrawn.toNumber()).toEqual(0);
			},
			TIMEOUT
		);

		it(
			'should partially refund a stream if canceled after the cliff but before the end time',
			async () => {
				const startTime = now() + 5;
				const amount = 1_000;
				const cliff_amount = 500;

				// Initial balances
				const aliceInitialBalance = await getTokenBalanceFor(aliceTokenAccount, banksClient);
				console.log('Alice Initial Balance: ', aliceInitialBalance.toNumber());

				const [treasuryTokenAccount] = await getTreasuryTokenAccount(tokenMint, program);
				const [stream] = await createStream(alice, bob, tokenMint, program, {
					startTime,
					endTime: startTime + 60,
					cliffTime: startTime + 30,
					amount,
				});

				const treasuryBalanceAfterCreation = await getTokenBalanceFor(treasuryTokenAccount, banksClient);
				expect(treasuryBalanceAfterCreation.toNumber()).toBe(amount);

				const aliceBalanceAfterCreation = await getTokenBalanceFor(aliceTokenAccount, banksClient);
				expect(aliceBalanceAfterCreation.toNumber()).toBe(aliceInitialBalance.toNumber() - amount);

				// Advance clock so that we are after cliff but still before the end time
				timeTravelTo(startTime + 30, banksClient, context);

				// Cancel the stream
				await program.methods
					.cancelLockupLinearStream()
					.accounts({
						sender: alice.publicKey,
						stream,
						tokenMint,
						tokenProgram: TOKEN_PROGRAM_ID,
						treasuryTokenAccount,
					})
					.signers([alice])
					.rpc();

				const treasuryBalanceAfterCancelation = await getTokenBalanceFor(treasuryTokenAccount, banksClient);
				expect(treasuryBalanceAfterCancelation.toNumber()).toBe(cliff_amount);

				const aliceBalanceAfterCancelation = await getTokenBalanceFor(aliceTokenAccount, banksClient);
				expect(aliceBalanceAfterCancelation.toNumber()).toBe(aliceBalanceAfterCreation.toNumber() + cliff_amount);

				// Verify the stream was canceled
				const streamData = await program.account.lockupLinearStream.fetch(stream);

				expect(streamData.baseStream.isCanceled).toBe(true);
				expect(streamData.baseStream.isCancelable).toBe(false);
				expect(streamData.baseStream.amounts.refunded.toNumber()).toEqual(cliff_amount);
				expect(streamData.baseStream.amounts.deposited.toNumber()).toEqual(amount);
				expect(streamData.baseStream.amounts.withdrawn.toNumber()).toEqual(0);
			},
			TIMEOUT
		);
	});

	describe('Lockup Linear Stream - Cancel - Error Flow', () => {
		it(
			"should fail if the sender is not the stream's creator",
			async () => {
				const [treasuryTokenAccount] = await getTreasuryTokenAccount(tokenMint, program);
				const [stream] = await createStream(alice, bob, tokenMint, program);

				// Attempt cancellation as Bob
				// @ts-expect-error - Type error in spl-token-bankrun dependency
				await createAssociatedTokenAccount(banksClient, bob, tokenMint, bob.publicKey);

				await expect(
					program.methods
						.cancelLockupLinearStream()
						.accounts({
							sender: bob.publicKey,
							stream,
							tokenMint,
							tokenProgram: TOKEN_PROGRAM_ID,
							treasuryTokenAccount,
						})
						.signers([bob])
						.rpc()
				).rejects.toThrow(/Only the Stream's Creator can cancel the Stream/);
			},
			TIMEOUT
		);

		it(
			'should fail if the stream is already canceled',
			async () => {
				const [treasuryTokenAccount] = await getTreasuryTokenAccount(tokenMint, program);
				const [stream] = await createStream(alice, bob, tokenMint, program);

				// Cancel once
				const cancelTx = await program.methods
					.cancelLockupLinearStream()
					.accounts({
						sender: alice.publicKey,
						stream,
						tokenMint,
						tokenProgram: TOKEN_PROGRAM_ID,
						treasuryTokenAccount,
					})
					.signers([alice])
					.rpc({
						// Needed to ensure that the blockchain does not think the transaction is a duplicate
						commitment: 'confirmed',
					});
				expect(cancelTx).toBeDefined();

				// Attempt to cancel again
				try {
					await program.methods
						.cancelLockupLinearStream()
						.accounts({
							sender: alice.publicKey,
							stream,
							tokenMint,
							tokenProgram: TOKEN_PROGRAM_ID,
							treasuryTokenAccount,
						})
						.signers([alice])
						.rpc();
				} catch (error: any) {
					const containsStreamIsAlreadyCanceled = error.toString().includes('Stream is already canceled');
					const identifiedAsDuplicate = error.toString().includes('This transaction has already been processed');
					expect(containsStreamIsAlreadyCanceled || identifiedAsDuplicate).toBe(true);
				}
			},
			TIMEOUT
		);

		it(
			'should fail if the stream is not cancelable',
			async () => {
				const [treasuryTokenAccount] = await getTreasuryTokenAccount(tokenMint, program);
				const [stream] = await createStream(alice, bob, tokenMint, program, {
					isCancelable: false,
				});

				// Attempt to cancel a non-cancelable stream
				await expect(
					program.methods
						.cancelLockupLinearStream()
						.accounts({
							sender: alice.publicKey,
							stream,
							tokenMint,
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
				const startTime = now() + 5;

				const [treasuryTokenAccount] = await getTreasuryTokenAccount(tokenMint, program);
				const [stream] = await createStream(alice, bob, tokenMint, program, {
					startTime,
					endTime: startTime + 5, // Ends quickly
					cliffTime: startTime, // No cliff
				});

				// Wait for the stream to end
				timeTravelFor(3600, banksClient, context);

				// Attempt to cancel an ended stream
				await expect(
					program.methods
						.cancelLockupLinearStream()
						.accounts({
							sender: alice.publicKey,
							stream,
							tokenMint,
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
		// Go back to present
		timeTravelTo(now(), banksClient, context);
	});
});
