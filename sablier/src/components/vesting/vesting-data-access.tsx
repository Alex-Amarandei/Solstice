'use client';

import { LockupLinearStream } from '@/types/lockup-linear';
import { getSablierProgram, getSablierProgramId } from '@project/anchor';
import { useConnection } from '@solana/wallet-adapter-react';
import { Cluster, PublicKey } from '@solana/web3.js';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useCluster } from '../cluster/cluster-data-access';
import { useAnchorProvider } from '../solana/solana-provider';
import { useTransactionToast } from '../ui/ui-layout';

export function useLockupLinearProgram() {
	const { connection } = useConnection();
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
		mutationFn: (lockupLinearStream: LockupLinearStream) => program.methods.createLockupLinearStream(lockupLinearStream).rpc(),
		onMutate: async (lockupLinearStream) => {
			await lockupLinearStreams.refetch();
		},
		onSuccess: (tx) => {
			transactionToast(tx);
			lockupLinearStreams.refetch();
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
	const transactionToast = useTransactionToast();
	const { program, lockupLinearStreams } = useLockupLinearProgram();

	const accountQuery = useQuery({
		queryKey: ['sablier', 'fetch', { cluster, account }],
		queryFn: () => program.account.streamCounter.fetch(account),
	});

	// const closeMutation = useMutation({
	// 	mutationKey: ['sablier', 'close', { cluster, account }],
	// 	mutationFn: () => program.methods.close().accounts({ sablier: account }).rpc(),
	// 	onSuccess: (tx) => {
	// 		transactionToast(tx);
	// 		return accounts.refetch();
	// 	},
	// });

	// const decrementMutation = useMutation({
	// 	mutationKey: ['sablier', 'decrement', { cluster, account }],
	// 	mutationFn: () => program.methods.decrement().accounts({ sablier: account }).rpc(),
	// 	onSuccess: (tx) => {
	// 		transactionToast(tx);
	// 		return accountQuery.refetch();
	// 	},
	// });

	// const incrementMutation = useMutation({
	// 	mutationKey: ['sablier', 'increment', { cluster, account }],
	// 	mutationFn: () => program.methods.increment().accounts({ sablier: account }).rpc(),
	// 	onSuccess: (tx) => {
	// 		transactionToast(tx);
	// 		return accountQuery.refetch();
	// 	},
	// });

	// const setMutation = useMutation({
	// 	mutationKey: ['sablier', 'set', { cluster, account }],
	// 	mutationFn: (value: number) => program.methods.set(value).accounts({ sablier: account }).rpc(),
	// 	onSuccess: (tx) => {
	// 		transactionToast(tx);
	// 		return accountQuery.refetch();
	// 	},
	// });

	return {
		accountQuery,
		// closeMutation,
		// decrementMutation,
		// incrementMutation,
		// setMutation,
	};
}
