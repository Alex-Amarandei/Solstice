import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { BanksClient, ProgramTestContext } from 'solana-bankrun';
import { createAssociatedTokenAccount } from 'spl-token-bankrun';

import { Sablier } from '@project/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getTokenBalanceFor, timeTravelFor, timeTravelTo } from '../bankrun-utils';
import { TIMEOUT } from '../constants';
import { beforeAllSetup, createStream } from './setup';
import { getTreasuryTokenAccount } from './utils';

describe('Lockup Linear Stream - Cancel Test', () => {
	let banksClient: BanksClient;
	let context: ProgramTestContext;
	let program: Program<Sablier>;

	let alice: Keypair;
	let aliceTokenAccount: PublicKey;

	let bob: Keypair;

	let mint: PublicKey;

	beforeAll(async () => {
		({ alice, aliceTokenAccount, banksClient, bob, context, mint, program } = await beforeAllSetup());
	}, TIMEOUT);

	describe('Lockup Linear Stream - Cancel - Happy Flow', () => {
		it(
			'should fully refund a stream if canceled before the cliff',
			async () => {
				const startTime = Math.floor(Date.now() / 1000) + 5;
				const amount = 1_000;

				// Initial balances
				const aliceInitialBalance = await getTokenBalanceFor(aliceTokenAccount, banksClient);
				console.log('Alice Initial Balance:', aliceInitialBalance.toNumber());

				const [treasuryTokenAccount] = await getTreasuryTokenAccount(mint, program);
				const [fullRefundStream] = await createStream(alice, bob, mint, program, {
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
				const startTime = Math.floor(Date.now() / 1000) + 5;
				const amount = 1_000;
				const cliff_amount = 500;

				// Initial balances
				const aliceInitialBalance = await getTokenBalanceFor(aliceTokenAccount, banksClient);
				console.log('Alice Initial Balance:', aliceInitialBalance.toNumber());

				const [treasuryTokenAccount] = await getTreasuryTokenAccount(mint, program);
				const [partialRefundStream] = await createStream(alice, bob, mint, program, {
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
						stream: partialRefundStream,
						tokenMint: mint,
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
				const streamData = await program.account.lockupLinearStream.fetch(partialRefundStream);

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
				const [treasuryTokenAccount] = await getTreasuryTokenAccount(mint, program);
				const [cancelableLockupLinearStream] = await createStream(alice, bob, mint, program);

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
				const [treasuryTokenAccount] = await getTreasuryTokenAccount(mint, program);
				const [canceledLockupLinearStream] = await createStream(alice, bob, mint, program);

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
						// Needed to ensure that the blockchain does not think the transaction is a duplicate
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
				const [treasuryTokenAccount] = await getTreasuryTokenAccount(mint, program);
				const [notCancelableLockupLinearStream] = await createStream(alice, bob, mint, program, {
					isCancelable: false,
				});

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

				const [treasuryTokenAccount] = await getTreasuryTokenAccount(mint, program);
				const [endedLockupLinearStream] = await createStream(alice, bob, mint, program, {
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
		const systemClock = Math.floor(Date.now() / 1000);
		timeTravelTo(systemClock, banksClient, context);
	});
});
