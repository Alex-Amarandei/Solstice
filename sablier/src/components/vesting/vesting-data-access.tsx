'use client';

import { CreateLockupLinearStreamArgs } from '@/utils/conversion';
import { getSablierProgram, getSablierProgramId } from '@project/anchor';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { useWallet } from '@solana/wallet-adapter-react';
import { Cluster, PublicKey } from '@solana/web3.js';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { useCluster } from '../cluster/cluster-data-access';
import { useAnchorProvider } from '../solana/solana-provider';
import { useTransactionToast } from '../ui/ui-layout';

export function useLockupLinearProgram() {
	const { publicKey } = useWallet();

	const { cluster } = useCluster();
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
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	return {
		program,
		createLockupLinearStream,
		lockupLinearStreams,
	};
}

export function useLockupLinearProgramAccount({ account }: { account: PublicKey }) {
	const { cluster } = useCluster();
	const { program } = useLockupLinearProgram();

	const accountQuery = useQuery({
		queryKey: ['sablier', 'fetch', { cluster, account }],
		queryFn: () => program.account.streamCounter.fetch(account),
	});

	return {
		accountQuery,
	};
}
