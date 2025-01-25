import { BN, Program } from '@coral-xyz/anchor';
import { Sablier } from '@project/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Keypair, PublicKey } from '@solana/web3.js';
import { SEEDS, STREAM_NAME } from '../constants';
import { environmentSetup } from '../stream-utils';
import { getStreamCounterIndex } from './utils';

export interface CreateLinearLockupStreamOptions {
	streamName?: string;
	startTime?: number;
	endTime?: number;
	cliffTime?: number;
	amount?: number;
	isCancelable?: boolean;
	isTransferable?: boolean;
}

export const beforeAllSetup = async () => {
	return environmentSetup(SEEDS.LOCKUP_LINEAR.COUNTER);
};

export const createStream = async (
	sender: Keypair,
	recipient: Keypair,
	mint: PublicKey,
	program: Program<Sablier>,
	options: CreateLinearLockupStreamOptions = {}
) => {
	// Assign defaults using destructuring
	const {
		streamName = STREAM_NAME,
		startTime = Math.floor(Date.now() / 1000) + 60, // Start in 1 minute
		endTime = startTime + 3600, // End in 1 hour
		cliffTime = startTime + 1800, // Cliff in 30 minutes
		amount = 1_000, // Default amount: 1K tokens
		isCancelable = true,
		isTransferable = true,
	} = options;

	// Get the stream counter index for the stream to be created
	const streamCounterIndex = await getStreamCounterIndex(program); // Ensure this function is defined

	// Send the createStream transaction
	const createStreamTx = await program.methods
		.createLockupLinearStream(
			streamName,
			recipient.publicKey,
			new BN(amount),
			new BN(startTime),
			new BN(endTime),
			new BN(cliffTime),
			isCancelable,
			isTransferable
		)
		.accounts({
			sender: sender.publicKey,
			tokenMint: mint,
			tokenProgram: TOKEN_PROGRAM_ID,
		})
		.signers([sender])
		.rpc();

	// Ensure the transaction was successful
	expect(createStreamTx).toBeDefined();

	// Derive the PDA for the newly created stream
	return PublicKey.findProgramAddressSync(
		[Buffer.from(SEEDS.LOCKUP_LINEAR.STREAM), new BN(streamCounterIndex).toArrayLike(Buffer, 'le', 8)],
		program.programId
	);
};
