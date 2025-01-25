import { Program } from '@coral-xyz/anchor';
import { Sablier } from '@project/anchor';
import { PublicKey } from '@solana/web3.js';
import { SEEDS } from '../constants';
import { getStreamCounterIndexWithSeed, getTreasuryTokenAccountWithSeeds } from '../stream-utils';

export const getStreamCounterIndex = async (program: Program<Sablier>) => {
	return getStreamCounterIndexWithSeed(program, SEEDS.LOCKUP_LINEAR.COUNTER);
};

//! Must be used before creating the stream since it gets the Stream Counter Index
//! which is used TO CREATE the stream
//! Calling this after creating the stream will result in it using a future counter index
export const getTreasuryTokenAccount = async (mint: PublicKey, program: Program<Sablier>) => {
	return getTreasuryTokenAccountWithSeeds(mint, program, SEEDS.LOCKUP_LINEAR.TREASURY, SEEDS.LOCKUP_LINEAR.COUNTER);
};
