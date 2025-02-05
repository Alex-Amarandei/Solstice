import { LockupLinearStreamState, TimeTuple } from '@/types/state';

export const EMPTY_STREAM: LockupLinearStreamState = {
	baseStream: {
		name: '',
		recipient: '',
		tokenMint: '',
		amount: 0,
		startTime: '',
		endTime: '',
		isCancelable: false,
		isTransferable: false,
	},
	cliffTime: '',
};

export const EMPTY_DURATION: TimeTuple = {
	days: '',
	hours: '',
	minutes: '',
};

export const EMPTY_CLIFF: TimeTuple = {
	days: '',
	hours: '',
	minutes: '',
};
