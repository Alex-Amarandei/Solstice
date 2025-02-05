import { LockupLinearStreamState, TimeTuple } from '@/types/state';
import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';
import { toast } from 'sonner';
import { getDuration } from './math';

export function isCreateStreamDataValid(stream: LockupLinearStreamState, duration: TimeTuple, cliff: TimeTuple) {
	if (stream.baseStream.name.length === 0) {
		toast.error('Name cannot be empty');
		return false;
	}

	try {
		new PublicKey(stream.baseStream.recipient);
	} catch (error) {
		toast.error('Invalid recipient');
		return false;
	}

	try {
		new PublicKey(stream.baseStream.tokenMint);
	} catch (error) {
		toast.error('Invalid Token Mint Address');
		return false;
	}

	try {
		new BN(stream.baseStream.amount);
	} catch (error) {
		toast.error('Invalid Amount');
		return false;
	}

	const amount = new BN(stream.baseStream.amount);
	if (amount.toNumber() <= 0) {
		toast.error('Amount must be greater than 0');
		return false;
	}

	if (stream.baseStream.startTime.length === 0) {
		// Duration was used
		const totalDuration = getDuration(duration);

		if (totalDuration <= 0) {
			toast.error('Invalid Stream duration');
			return false;
		}

		const cliffDuration = getDuration(cliff);

		if (cliffDuration < 0) {
			toast.error('Invalid Cliff duration');
			return false;
		}

		if (cliffDuration > totalDuration) {
			toast.error('Cliff duration cannot be greater than total duration');
			return false;
		}

		return true;
	}

	const now = Date.now() / 1000;
	const startTime = new Date(stream.baseStream.startTime).getTime() / 1000;
	const endTime = new Date(stream.baseStream.endTime).getTime() / 1000;

	if (startTime < now) {
		toast.error('Start time cannot be in the past');
		return false;
	}

	if (endTime < startTime) {
		toast.error('End time must be greater than start time');
		return false;
	}

	if (stream.cliffTime.length !== 0) {
		const cliffTime = new Date(stream.cliffTime).getTime() / 1000;

		if (cliffTime === 0) {
			return true;
		}

		if (cliffTime < startTime) {
			toast.error('Cliff time cannot be before start time');
			return false;
		}

		if (cliffTime > endTime) {
			toast.error('Cliff time cannot be after end time');
			return false;
		}
	}

	return true;
}
