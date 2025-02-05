export type LockupLinearStreamState = {
	baseStream: {
		name: string;
		recipient: string;
		tokenMint: string;
		amount: number;
		startTime: string;
		endTime: string;
		isCancelable: boolean;
		isTransferable: boolean;
	};
	cliffTime: string;
};

export type TimeTuple = {
	days: string;
	hours: string;
	minutes: string;
};
