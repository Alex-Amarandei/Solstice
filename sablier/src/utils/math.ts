import { LockupLinearStream } from '@/types/lockup-linear';
import { LockupLinearStreamState, TimeTuple } from '@/types/state';
import { BN } from 'bn.js';

export function getElapsedAmount(stream: LockupLinearStream) {
	const now = Date.now() / 1000;

	const startTime = stream.baseStream.startTime.toNumber();
	const cliffTime = stream.cliffTime.toNumber();
	const endTime = stream.baseStream.endTime.toNumber();

	const deposited = stream.baseStream.amounts.deposited.toNumber();
	const refunded = stream.baseStream.amounts.refunded.toNumber();

	if (now < startTime || now < cliffTime) {
		return 0;
	}

	if (now > endTime) {
		return deposited;
	}

	const elapsedTimePercentage = (now - startTime) / (endTime - startTime);
	const elapsedAmount = Math.floor(deposited * elapsedTimePercentage);

	return Math.min(deposited - refunded, elapsedAmount);
}

export function getDuration(duration: TimeTuple) {
	return Number(duration.days) * 24 * 60 * 60 + Number(duration.hours) * 60 * 60 + Number(duration.minutes) * 60;
}

export function getTimesFromDuration(duration: TimeTuple, cliff: TimeTuple) {
	const now = Date.now() / 1000 + 5;

	return {
		startTime: new BN(now),
		endTime: new BN(now + getDuration(duration)),
		cliffTime: new BN(now + getDuration(cliff)),
	};
}

export function getTimesFromDates(stream: LockupLinearStreamState) {
	const startTime = new BN(new Date(stream.baseStream.startTime).getTime() / 1000);
	let cliffTime = new BN(new Date(stream.cliffTime).getTime() / 1000);

	if (stream.cliffTime.length === 0) {
		cliffTime = startTime;
	}

	return {
		startTime,
		endTime: new BN(new Date(stream.baseStream.endTime).getTime() / 1000),
		cliffTime,
	};
}

export function getElapsedPercentage(stream: LockupLinearStream) {
	const elapsedAmount = getElapsedAmount(stream);
	const depositedAmount = stream.baseStream.amounts.deposited.toNumber();

	return (elapsedAmount / depositedAmount) * 100;
}

export function getWithdrawnPercentage(stream: LockupLinearStream) {
	const withdrawnAmount = stream.baseStream.amounts.withdrawn.toNumber();
	const depositedAmount = stream.baseStream.amounts.deposited.toNumber();

	return (withdrawnAmount / depositedAmount) * 100;
}

export function canBeWithdrawnFrom(stream: LockupLinearStream) {
	const now = Date.now() / 1000;

	const startTime = stream.baseStream.startTime.toNumber();
	const cliffTime = stream.cliffTime.toNumber();
	const endTime = stream.baseStream.endTime.toNumber();

	const deposited = stream.baseStream.amounts.deposited.toNumber();
	const withdrawn = stream.baseStream.amounts.withdrawn.toNumber();
	const refunded = stream.baseStream.amounts.refunded.toNumber();

	if (now < startTime || now < cliffTime) {
		return false;
	}

	if (now > endTime) {
		return deposited > withdrawn + refunded;
	}

	return getElapsedAmount(stream) > 0;
}
