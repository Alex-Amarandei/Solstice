import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { BanksClient, Clock, ProgramTestContext } from 'solana-bankrun';

export async function timeTravelTo(timestamp: number, banksClient: BanksClient, context: ProgramTestContext) {
	const currentClock = await banksClient.getClock();
	context.setClock(
		new Clock(
			currentClock.slot,
			currentClock.epochStartTimestamp,
			currentClock.epoch,
			currentClock.leaderScheduleEpoch,
			BigInt(timestamp)
		)
	);
}

export async function timeTravelFor(amount: number, banksClient: BanksClient, context: ProgramTestContext) {
	const currentClock = await banksClient.getClock();
	const now = currentClock.unixTimestamp;
	context.setClock(
		new Clock(
			currentClock.slot,
			currentClock.epochStartTimestamp,
			currentClock.epoch,
			currentClock.leaderScheduleEpoch,
			now + BigInt(amount)
		)
	);
}

export async function getTokenBalanceFor(account: PublicKey, client: BanksClient): Promise<BN> {
	console.log('Getting token balance by account: ', account.toBase58());
	const accountData = (await client.getAccount(account))?.data;

	return new BN(getTokenBalanceForAccountData(accountData!));
}

function getTokenBalanceForAccountData(ataData: Uint8Array): string {
	// Amount is located at byte offset 64 and is 8 bytes long
	const amountOffset = 64;
	const amountBytes = ataData.slice(amountOffset, amountOffset + 8);

	// Convert the 8 bytes to a bigint (little-endian)
	const balance = BigInt(amountBytes.reduce((acc, byte, index) => acc + BigInt(byte) * (1n << (8n * BigInt(index))), 0n));

	return balance.toString();
}
