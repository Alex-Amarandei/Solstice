import { LockupLinearStreamState, TimeTuple } from '@/types/state';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { getTimesFromDates, getTimesFromDuration } from './math';

export function toCreateLockupLinearStreamArgs(
	streamState: LockupLinearStreamState,
	duration: TimeTuple,
	cliff: TimeTuple
): CreateLockupLinearStreamArgs {
	const durationWasUsed = streamState.baseStream.endTime.length === 0;

	const { startTime, endTime, cliffTime } = durationWasUsed ? getTimesFromDuration(duration, cliff) : getTimesFromDates(streamState);

	return {
		name: streamState.baseStream.name,
		recipient: new PublicKey(streamState.baseStream.recipient),
		amount: new BN(streamState.baseStream.amount * 10 ** 9),
		startTime,
		endTime,
		cliffTime,
		tokenMint: new PublicKey(streamState.baseStream.tokenMint),
		isCancelable: streamState.baseStream.isCancelable,
		isTransferable: streamState.baseStream.isTransferable,
	};
}

export function toStreamCounterIndex(streamId: string) {
	return streamId.split('-')[1];
}

export type CreateLockupLinearStreamArgs = {
	name: string;
	recipient: PublicKey;
	amount: BN;
	startTime: BN;
	endTime: BN;
	tokenMint: PublicKey;
	isCancelable: boolean;
	isTransferable: boolean;
	cliffTime: BN;
};
