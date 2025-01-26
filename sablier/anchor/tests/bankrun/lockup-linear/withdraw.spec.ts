import { BN, Program } from '@coral-xyz/anchor';
import { Sablier } from '@project/anchor';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Keypair, PublicKey } from '@solana/web3.js';
import { BanksClient, ProgramTestContext } from 'solana-bankrun';
import { getTokenBalanceFor, timeTravelTo } from '../bankrun-utils';
import { TIMEOUT } from '../constants';
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
			const startTime = Math.floor(Date.now() / 1000) + 5;

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
});
