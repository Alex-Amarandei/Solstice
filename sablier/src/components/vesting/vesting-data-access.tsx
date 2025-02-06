'use client';

import { SEEDS } from '@/utils/constants';
import { CreateLockupLinearStreamArgs, toStreamCounterIndex } from '@/utils/conversion';
import { getSablierProgram, getSablierProgramId } from '@project/anchor';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { useWallet } from '@solana/wallet-adapter-react';
import { Cluster, PublicKey } from '@solana/web3.js';
import { useMutation, useQuery } from '@tanstack/react-query';
import BN from 'bn.js';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { useCluster } from '../cluster/cluster-data-access';
import { useCounterProgram } from '../counter/counter-data-access';
import { useAnchorProvider } from '../solana/solana-provider';
import { useTransactionToast } from '../ui/ui-layout';
import { getStreamAddressById } from './stream/stream-data-access';

export function useLockupLinearProgram() {
	const { publicKey } = useWallet();
	const { cluster } = useCluster();

	const { streamCounterAccounts } = useCounterProgram();

	const router = useRouter();
	const transactionToast = useTransactionToast();
	const provider = useAnchorProvider();
	const programId = useMemo(() => getSablierProgramId(cluster.network as Cluster), [cluster]);
	const program = useMemo(() => getSablierProgram(provider, programId), [provider, programId]);

	const lockupLinearStreams = useQuery({
		queryKey: ['lockupLinear', 'all', { cluster }],
		queryFn: () => program.account.lockupLinearStream.all(),
	});

	const createLockupLinearStream = useMutation({
		mutationKey: ['lockupLinear', 'create', { cluster }],
		mutationFn: (stream: CreateLockupLinearStreamArgs) =>
			program.methods
				.createLockupLinearStream(
					stream.name,
					stream.recipient,
					stream.amount,
					stream.startTime,
					stream.endTime,
					stream.cliffTime,
					stream.isCancelable,
					stream.isTransferable
				)
				.accounts({
					sender: publicKey!,
					tokenMint: stream.tokenMint,
					tokenProgram: TOKEN_2022_PROGRAM_ID,
				})
				.rpc(),
		onMutate: async () => {
			await lockupLinearStreams.refetch();
		},
		onSuccess: (tx) => {
			transactionToast(tx);
			lockupLinearStreams.refetch();
			const [streamPda] = PublicKey.findProgramAddressSync(
				[
					Buffer.from(SEEDS.LOCKUP_LINEAR.STREAM),
					streamCounterAccounts.data!.at(0)!.account.streamIndex.toArrayLike(Buffer, 'le', 8),
				],
				program.programId
			);
			const createdStream = lockupLinearStreams.data?.find((stream) => stream.publicKey.equals(streamPda));
			router.push(`/vesting/stream/${createdStream?.account.baseStream.id}`);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const cancelLockupLinearStream = useMutation({
		mutationKey: ['lockupLinear', 'cancel', { cluster }],
		mutationFn: ({ streamId, tokenMint }: { streamId: string; tokenMint: PublicKey }) => {
			const stream = getStreamAddressById(streamId, programId);
			const streamCounterIndex = toStreamCounterIndex(streamId);
			const [treasuryTokenAccount] = PublicKey.findProgramAddressSync(
				[Buffer.from(SEEDS.LOCKUP_LINEAR.TREASURY), tokenMint.toBuffer(), new BN(streamCounterIndex).toArrayLike(Buffer, 'le', 8)],
				program.programId
			);

			return program.methods
				.cancelLockupLinearStream()
				.accounts({
					sender: publicKey!,
					stream,
					tokenMint,
					tokenProgram: TOKEN_2022_PROGRAM_ID,
					treasuryTokenAccount,
				})
				.rpc();
		},
		onMutate: async () => {
			await lockupLinearStreams.refetch();
		},
		onSuccess: (tx) => {
			transactionToast(tx);
			lockupLinearStreams.refetch();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	return {
		program,
		createLockupLinearStream,
		cancelLockupLinearStream,
		lockupLinearStreams,
	};
}

export function useLockupLinearProgramAccount({ account }: { account: PublicKey }) {
	const { cluster } = useCluster();
	const { program } = useLockupLinearProgram();

	const streamQuery = useQuery({
		queryKey: ['lockupLinear', 'fetch', { cluster, account }],
		queryFn: () => program.account.lockupLinearStream.fetch(account),
	});

	return {
		streamQuery,
	};
}
