import BN from 'bn.js';
import { BaseStream } from './base';

export type LockupLinearStream = {
	baseStream: BaseStream;
	cliffTime: BN;
};
