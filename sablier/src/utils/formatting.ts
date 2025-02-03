import { LockupLinearStream } from '@/types/lockup-linear';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export function formatAmount(amount: BN) {
	return formatNumberAmount(amount.toNumber());
}

export function formatNumberAmount(amount: number) {
	return amount;
}

export function formatShortenPubkey(pubkey: PublicKey) {
	const publicKey = pubkey.toBase58();
	return `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
}

export function formatStreamState(stream: LockupLinearStream) {
	if (stream.baseStream.isCanceled) {
		return 'Canceled';
	}

	const now = Date.now() / 1000;

	if (now < stream.baseStream.startTime.toNumber()) {
		return 'Not Started';
	}

	if (now < stream.cliffTime.toNumber()) {
		return 'Cliff';
	}

	if (now < stream.baseStream.endTime.toNumber()) {
		return 'Streaming';
	}

	const deposited = stream.baseStream.amounts.deposited.toNumber();
	const refunded = stream.baseStream.amounts.refunded.toNumber();
	const withdrawn = stream.baseStream.amounts.withdrawn.toNumber();

	if (deposited === withdrawn + refunded) {
		return 'Depleted';
	}

	return 'Ended';
}

export function formatTimeline(startTime: BN, endTime: BN, cliffTime: BN) {
	return `${formatDate(startTime)} - ${formatDate(endTime)} (${formatDate(cliffTime)})`;
}

export function formatDate(date: BN) {
	return new Date(date.toNumber() * 1000).toLocaleDateString();
}
