'use client';

import { useCluster } from '@/components/cluster/cluster-data-access';
import { SEEDS } from '@/utils/constants';
import { toStreamCounterIndex } from '@/utils/conversion';
import { getSablierProgramId } from '@project/anchor';
import { Cluster, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { useMemo } from 'react';
import { useLockupLinearProgramAccount } from '../vesting-data-access';

export function useGetStreamById(streamId: string) {
	const { cluster } = useCluster();
	const programId = useMemo(() => getSablierProgramId(cluster.network as Cluster), [cluster]);
	const streamAddress = useMemo(() => {
		return getStreamAddressById(streamId, programId);
	}, [programId, streamId]);
	const { streamQuery } = useLockupLinearProgramAccount({ account: streamAddress });

	return {
		stream: streamQuery.data,
		isLoading: streamQuery.isLoading,
		error: streamQuery.error,
	};
}

export function getStreamAddressById(streamId: string, programId: PublicKey) {
	return PublicKey.findProgramAddressSync(
		[Buffer.from(SEEDS.LOCKUP_LINEAR.STREAM), new BN(toStreamCounterIndex(streamId)).toArrayLike(Buffer, 'le', 8)],
		programId
	)[0];
}
