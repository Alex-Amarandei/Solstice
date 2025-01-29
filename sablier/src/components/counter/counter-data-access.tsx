'use client';

import { getSablierProgram, getSablierProgramId } from '@project/anchor';
import { Cluster, PublicKey } from '@solana/web3.js';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { useCluster } from '../cluster/cluster-data-access';
import { useAnchorProvider } from '../solana/solana-provider';
import { useTransactionToast } from '../ui/ui-layout';

export function useCounterProgram() {
	const { cluster } = useCluster();
	const transactionToast = useTransactionToast();
	const provider = useAnchorProvider();
	const programId = useMemo(() => getSablierProgramId(cluster.network as Cluster), [cluster]);
	const program = useMemo(() => getSablierProgram(provider, programId), [provider, programId]);

	const streamCounterAccounts = useQuery({
		queryKey: ['sablier', 'all', { cluster }],
		queryFn: () => program.account.streamCounter.all(),
	});

	const initializeStreamCounter = useMutation({
		mutationKey: ['sablier', 'initialize', { cluster }],
		mutationFn: (publicKey: PublicKey) => program.methods.initializeLockupLinearStreamCounter().accounts({ sender: publicKey }).rpc(),
		onSuccess: (signature) => {
			transactionToast(signature);
			return streamCounterAccounts.refetch();
		},
		onError: () => toast.error('Failed to initialize account'),
	});

	return {
		streamCounterAccounts,
		initializeStreamCounter,
	};
}
