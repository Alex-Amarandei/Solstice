'use client';

import { CounterCreate, CounterList, CounterNotConnected } from '@/components/counter/counter-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { useCounterProgram } from './counter-data-access';

export default function CounterFeature() {
	const { publicKey } = useWallet();
	const { streamCounterAccounts, initializeStreamCounter } = useCounterProgram();
	const [hasAccount, setHasAccount] = useState(false);

	useEffect(() => {
		if (streamCounterAccounts?.data?.length && streamCounterAccounts?.data?.length > 0) {
			setHasAccount(true);
		}
	}, [streamCounterAccounts]);

	if (!publicKey) {
		return <CounterNotConnected />;
	}

	return (
		<div className="flex flex-col items-center justify-center min-h-screen p-8">
			{!hasAccount ? (
				<CounterCreate
					onCreate={() => initializeStreamCounter.mutateAsync(publicKey)}
					isPending={initializeStreamCounter.isPending}
				/>
			) : (
				<CounterList
					authority={streamCounterAccounts.data?.at(0)?.account.authority.toBase58() ?? '[Public Key]'}
					index={streamCounterAccounts.data?.at(0)?.account.streamIndex.toNumber() ?? 0}
				/>
			)}
		</div>
	);
}
