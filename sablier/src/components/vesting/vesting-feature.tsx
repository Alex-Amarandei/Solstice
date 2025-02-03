'use client';

import { Breadcrumb, NotConnected } from '@/components/ui/ui-common';
import { TableWithTabs } from '@/components/vesting/table-with-tabs';
import { useWallet } from '@solana/wallet-adapter-react';

export default function VestingFeature() {
	const { publicKey } = useWallet();

	if (!publicKey) {
		return <NotConnected />;
	}

	return (
		<div className="w-full flex flex-col">
			<Breadcrumb />
			<h1 className="text-white text-4xl font-normal px-4 mb-12">Vesting Streams</h1>
			<TableWithTabs />
		</div>
	);
}
