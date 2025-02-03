import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export type BaseStream = {
	id: string;
	name: string;
	sender: PublicKey;
	recipient: PublicKey;
	tokenMint: PublicKey;
	amounts: Amounts;
	startTime: BN;
	endTime: BN;
	isCancelable: boolean;
	isCanceled: boolean;
	isTransferable: boolean;
};

export type Amounts = {
	deposited: BN;
	refunded: BN;
	withdrawn: BN;
};
