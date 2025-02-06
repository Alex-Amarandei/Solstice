import { LockupLinearStream } from '@/types/lockup-linear';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export function formatAmount(amount: BN) {
	return formatNumberAmount(amount.toNumber());
}

export function formatNumberAmount(amount: number) {
	return amount / 10 ** 9;
}

export function formatNumberAmountWithPrecision(amount: number, precision: number = 0) {
	return `${formatNumberAmount(amount).toFixed(precision)}`;
}

export function formatShortenPubkey(pubkey: PublicKey) {
	return formatShortenString(pubkey.toBase58());
}

export function formatShortenString(str: string) {
	return `${str.slice(0, 4)}...${str.slice(-4)}`;
}

export function formatStreamState(stream: LockupLinearStream) {
	const deposited = stream.baseStream.amounts.deposited.toNumber();
	const refunded = stream.baseStream.amounts.refunded.toNumber();
	const withdrawn = stream.baseStream.amounts.withdrawn.toNumber();

	if (deposited === withdrawn + refunded) {
		return 'Depleted';
	}

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

	return 'Ended';
}

export function formatTimeline(startTime: BN, endTime: BN, cliffTime: BN) {
	return `${formatDate(startTime)} - ${formatDate(endTime)} (${formatDate(cliffTime)})`;
}

export function formatDate(date: BN) {
	return new Date(date.toNumber() * 1000).toLocaleDateString();
}

export function formatCancelabilityStatus(stream: LockupLinearStream) {
	const streamStatus = formatStreamState(stream);
	if (streamStatus === 'Canceled' || streamStatus === 'Depleted' || streamStatus === 'Ended') {
		return 'Not Anymore';
	}

	return stream.baseStream.isCancelable ? 'Yes' : 'No';
}

export function formatStartStatus(startTime: BN) {
	const now = Date.now() / 1000;

	if (now < startTime.toNumber()) {
		return 'Will Start On';
	}

	return 'Started On';
}

export function formatPercentage(percentage: number) {
	if (percentage % 100 === 0) {
		return `${percentage.toFixed(0)}%`;
	}

	return `${percentage.toFixed(2)}%`;
}

export function truncateString(str: string, maxLength: number) {
	return str.length <= maxLength ? str : str.slice(0, maxLength) + '...';
}
