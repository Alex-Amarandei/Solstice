import { BN, Program } from '@coral-xyz/anchor';
import { Sablier } from '@project/anchor';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Keypair, PublicKey } from '@solana/web3.js';
import { BanksClient, ProgramTestContext } from 'solana-bankrun';
import { getTokenBalanceFor, timeTravelFor, timeTravelTo } from '../bankrun-utils';
import { TIMEOUT } from '../constants';
import { now } from '../stream-utils';
import { beforeAllSetup, createStream } from './setup';
import { getTreasuryTokenAccount } from './utils';

describe('Lockup Linear Stream - Withdraw Test', () => {
	let banksClient: BanksClient;
	let context: ProgramTestContext;
	let program: Program<Sablier>;

	let alice: Keypair;
	let aliceTokenAccount: PublicKey;

	let bob: Keypair;
	let bobTokenAccount: PublicKey;

	let tokenMint: PublicKey;

	beforeAll(async () => {
		({ alice, aliceTokenAccount, banksClient, bob, context, tokenMint, program } = await beforeAllSetup());
	}, TIMEOUT);

	describe('Lockup Linear Stream - Withdraw - Happy Flow', () => {
		it('should withdraw from a stream after the cliff', async () => {
			const amount = 1_000;
			const startTime = now() + 5;

			// Initial balances
			const aliceInitialBalance = await getTokenBalanceFor(aliceTokenAccount, banksClient);
			console.log('Alice Initial Balance: ', aliceInitialBalance.toNumber());

			const [treasuryTokenAccount] = await getTreasuryTokenAccount(tokenMint, program);
			const [stream] = await createStream(alice, bob, tokenMint, program, {
				startTime,
				cliffTime: startTime, // No cliff
				endTime: startTime + 100,
				amount,
			});

			const treasuryBalanceAfterCreation = await getTokenBalanceFor(treasuryTokenAccount, banksClient);
			expect(treasuryBalanceAfterCreation.toNumber()).toBe(amount);

			const aliceBalanceAfterCreation = await getTokenBalanceFor(aliceTokenAccount, banksClient);
			expect(aliceBalanceAfterCreation.toNumber()).toBe(aliceInitialBalance.toNumber() - amount);

			// The stream should be 75% elapsed at this point
			timeTravelTo(startTime + 75, banksClient, context);

			const withdrawnAmount = 750;
			// Withdraw after cliff
			await program.methods
				.withdrawFromLockupLinearStream(new BN(withdrawnAmount))
				.accounts({
					recipient: bob.publicKey,
					stream,
					tokenMint,
					tokenProgram: TOKEN_PROGRAM_ID,
					treasuryTokenAccount,
				})
				.signers([bob])
				.rpc();

			// Treasury balance should be reduced by the withdrawn amount
			const treasuryBalanceAfterWithdraw = await getTokenBalanceFor(treasuryTokenAccount, banksClient);
			expect(treasuryBalanceAfterWithdraw.toNumber()).toBe(amount - withdrawnAmount);

			// Alice should not have any balance changes
			const aliceBalanceAfterWithdraw = await getTokenBalanceFor(aliceTokenAccount, banksClient);
			expect(aliceBalanceAfterWithdraw.toNumber()).toBe(aliceBalanceAfterCreation.toNumber());

			// Bob should have received the withdrawn amount
			bobTokenAccount = getAssociatedTokenAddressSync(tokenMint, bob.publicKey);
			const bobBalanceAfterWithdraw = await getTokenBalanceFor(bobTokenAccount, banksClient);
			expect(bobBalanceAfterWithdraw.toNumber()).toBe(withdrawnAmount);

			// Check Stream amounts have been properly updated
			const streamAfterWithdraw = await program.account.lockupLinearStream.fetch(stream);
			expect(streamAfterWithdraw.baseStream.amounts.deposited.toNumber()).toBe(amount);
			expect(streamAfterWithdraw.baseStream.amounts.refunded.toNumber()).toBe(0);
			expect(streamAfterWithdraw.baseStream.amounts.withdrawn.toNumber()).toBe(withdrawnAmount);
		});
	});

	describe('Lockup Linear Stream - Withdraw - Error Flow', () => {
		it("should fail if the signer is not the stream's recipient", async () => {
			// Create Stream
			const [treasuryTokenAccount] = await getTreasuryTokenAccount(tokenMint, program);
			const [stream] = await createStream(alice, bob, tokenMint, program);

			// Attempt to withdraw as Alice
			await expect(
				program.methods
					.withdrawFromLockupLinearStream(new BN(1))
					.accounts({
						recipient: alice.publicKey,
						stream,
						tokenMint,
						tokenProgram: TOKEN_PROGRAM_ID,
						treasuryTokenAccount,
					})
					.signers([alice])
					.rpc()
			).rejects.toThrow(/Only the Stream's Recipient can withdraw from the Stream/);
		});

		it('should fail if the amount is zero', async () => {
			// Create Stream
			const [treasuryTokenAccount] = await getTreasuryTokenAccount(tokenMint, program);
			const [stream] = await createStream(alice, bob, tokenMint, program);

			// Attempt to withdraw zero
			await expect(
				program.methods
					.withdrawFromLockupLinearStream(new BN(0))
					.accounts({
						recipient: bob.publicKey,
						stream,
						tokenMint,
						tokenProgram: TOKEN_PROGRAM_ID,
						treasuryTokenAccount,
					})
					.signers([bob])
					.rpc()
			).rejects.toThrow(/Amount must be greater than 0/);
		});

		it("should fail if the stream hasn't started", async () => {
			// Create Stream
			const [treasuryTokenAccount] = await getTreasuryTokenAccount(tokenMint, program);
			const [stream] = await createStream(alice, bob, tokenMint, program, {
				startTime: now() + 100,
			});

			// Attempt to withdraw before the stream's start
			await expect(
				program.methods
					.withdrawFromLockupLinearStream(new BN(1))
					.accounts({
						recipient: bob.publicKey,
						stream,
						tokenMint,
						tokenProgram: TOKEN_PROGRAM_ID,
						treasuryTokenAccount,
					})
					.signers([bob])
					.rpc()
			).rejects.toThrow(/Stream has not started yet/);
		});

		it('should fail if the stream is empty due to cancelation', async () => {
			const startTime = now() + 5;
			const cliffTime = startTime + 10;
			const endTime = startTime + 100;

			// Create Stream
			const [treasuryTokenAccount] = await getTreasuryTokenAccount(tokenMint, program);
			const [stream] = await createStream(alice, bob, tokenMint, program, {
				startTime,
				cliffTime,
				endTime,
			});

			// Immediately cancel the Stream (before the cliff)
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
				.rpc();
			expect(cancelTx).toBeDefined();

			// Go to the cliff's end
			timeTravelTo(cliffTime, banksClient, context);

			// Attempt to withdraw after cliff
			await expect(
				program.methods
					.withdrawFromLockupLinearStream(new BN(1))
					.accounts({
						recipient: bob.publicKey,
						stream,
						tokenMint,
						tokenProgram: TOKEN_PROGRAM_ID,
						treasuryTokenAccount,
					})
					.signers([bob])
					.rpc()
			).rejects.toThrow(/Stream is empty/);
		});

		it('should fail if the stream is empty due to full withdrawal', async () => {
			const startTime = now() + 5;
			const cliffTime = startTime + 50;
			const endTime = startTime + 100;

			// Create Stream
			const [treasuryTokenAccount] = await getTreasuryTokenAccount(tokenMint, program);
			const [stream] = await createStream(alice, bob, tokenMint, program, {
				startTime,
				cliffTime,
				endTime,
			});

			// Go to the stream's end
			timeTravelTo(endTime, banksClient, context);

			// Withdraw everything
			const withdrawTx = await program.methods
				.withdrawFromLockupLinearStream(new BN(1_000))
				.accounts({
					recipient: bob.publicKey,
					stream,
					tokenMint,
					tokenProgram: TOKEN_PROGRAM_ID,
					treasuryTokenAccount,
				})
				.signers([bob])
				.rpc();
			expect(withdrawTx).toBeDefined();

			// Attempt to withdraw after emptying the stream
			await expect(
				program.methods
					.withdrawFromLockupLinearStream(new BN(1))
					.accounts({
						recipient: bob.publicKey,
						stream,
						tokenMint,
						tokenProgram: TOKEN_PROGRAM_ID,
						treasuryTokenAccount,
					})
					.signers([bob])
					.rpc()
			).rejects.toThrow(/Stream is empty/);
		});

		it('should fail if the stream is empty due to withdrawal and refund', async () => {
			const startTime = now() + 5;
			const cliffTime = startTime + 50;
			const endTime = startTime + 100;

			// Create Stream
			const [treasuryTokenAccount] = await getTreasuryTokenAccount(tokenMint, program);
			const [stream] = await createStream(alice, bob, tokenMint, program, {
				startTime,
				cliffTime,
				endTime,
			});

			// Go to the cliff time
			timeTravelTo(cliffTime, banksClient, context);

			const aliceBalanceBeforeCancelation = await getTokenBalanceFor(aliceTokenAccount, banksClient);
			const bobBalanceBeforeWithdrawal = await getTokenBalanceFor(bobTokenAccount, banksClient);

			// Cancel the stream
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
				.rpc();
			expect(cancelTx).toBeDefined();

			// Withdraw half of the stream (cliff unlock)
			const withdrawTx = await program.methods
				.withdrawFromLockupLinearStream(new BN(500))
				.accounts({
					recipient: bob.publicKey,
					stream,
					tokenMint,
					tokenProgram: TOKEN_PROGRAM_ID,
					treasuryTokenAccount,
				})
				.signers([bob])
				.rpc();
			expect(withdrawTx).toBeDefined();

			const streamData = await program.account.lockupLinearStream.fetch(stream);
			expect(streamData.baseStream.amounts.deposited.toNumber()).toBe(1_000);
			expect(streamData.baseStream.amounts.refunded.toNumber()).toBe(500);
			expect(streamData.baseStream.amounts.withdrawn.toNumber()).toBe(500);

			const aliceBalanceAfterCancelation = await getTokenBalanceFor(aliceTokenAccount, banksClient);
			expect(aliceBalanceAfterCancelation.toNumber()).toBe(aliceBalanceBeforeCancelation.toNumber() + 500);

			const bobBalanceAfterWithdrawal = await getTokenBalanceFor(bobTokenAccount, banksClient);
			expect(bobBalanceAfterWithdrawal.toNumber()).toBe(bobBalanceBeforeWithdrawal.toNumber() + 500);

			// Attempt to withdraw after emptying the stream
			await expect(
				program.methods
					.withdrawFromLockupLinearStream(new BN(1))
					.accounts({
						recipient: bob.publicKey,
						stream,
						tokenMint,
						tokenProgram: TOKEN_PROGRAM_ID,
						treasuryTokenAccount,
					})
					.signers([bob])
					.rpc()
			).rejects.toThrow(/Stream is empty/);
		});

		it("should fail if the cliff hasn't ended", async () => {
			const startTime = now() + 5;

			// Create Stream
			const [treasuryTokenAccount] = await getTreasuryTokenAccount(tokenMint, program);
			const [stream] = await createStream(alice, bob, tokenMint, program, {
				startTime,
				cliffTime: startTime + 5,
			});

			// Go right before the cliff's end
			timeTravelTo(startTime + 4, banksClient, context);

			// Attempt to withdraw before the cliff's end
			await expect(
				program.methods
					.withdrawFromLockupLinearStream(new BN(1))
					.accounts({
						recipient: bob.publicKey,
						stream,
						tokenMint,
						tokenProgram: TOKEN_PROGRAM_ID,
						treasuryTokenAccount,
					})
					.signers([bob])
					.rpc()
			).rejects.toThrow(/The cliff time has not passed yet/);
		});

		it('should fail if the amount exceeds total balance', async () => {
			// Create Stream
			const [treasuryTokenAccount] = await getTreasuryTokenAccount(tokenMint, program);
			const [stream] = await createStream(alice, bob, tokenMint, program);

			// Go way after the stream's end
			timeTravelFor(86_400, banksClient, context);

			// Attempt to withdraw more than the 1_000 deposited
			await expect(
				program.methods
					.withdrawFromLockupLinearStream(new BN(1_001))
					.accounts({
						recipient: bob.publicKey,
						stream,
						tokenMint,
						tokenProgram: TOKEN_PROGRAM_ID,
						treasuryTokenAccount,
					})
					.signers([bob])
					.rpc()
			).rejects.toThrow(/Withdrawal amount exceeds available balance/);
		});

		it('should fail if the amount exceeds available balance', async () => {
			// Create Stream
			const startTime = now() + 5;

			const [treasuryTokenAccount] = await getTreasuryTokenAccount(tokenMint, program);
			const [stream] = await createStream(alice, bob, tokenMint, program, {
				startTime,
				cliffTime: startTime + 50,
				endTime: startTime + 100,
			});

			// Go to 80% of the Stream's time
			timeTravelTo(startTime + 80, banksClient, context);

			// Attempt to withdraw more than the 800 available
			await expect(
				program.methods
					.withdrawFromLockupLinearStream(new BN(801))
					.accounts({
						recipient: bob.publicKey,
						stream,
						tokenMint,
						tokenProgram: TOKEN_PROGRAM_ID,
						treasuryTokenAccount,
					})
					.signers([bob])
					.rpc()
			).rejects.toThrow(/Withdrawal amount exceeds available balance/);
		});
	});

	afterEach(async () => {
		// Go back to present
		timeTravelTo(now(), banksClient, context);
	});
});
