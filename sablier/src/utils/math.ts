import { LockupLinearStream } from '@/types/lockup-linear';

export function getElapsedAmount(stream: LockupLinearStream) {
	const now = Date.now() / 1000;

	const startTime = stream.baseStream.startTime.toNumber();
	const cliffTime = stream.cliffTime.toNumber();
	const endTime = stream.baseStream.endTime.toNumber();

	const deposited = stream.baseStream.amounts.deposited.toNumber();

	if (now < startTime || now < cliffTime) {
		return 0;
	}

	if (now > endTime) {
		return deposited;
	}

	const elapsedTimePercentage = (now - startTime) / (endTime - startTime);
	return Math.floor(deposited * elapsedTimePercentage);
}
