'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { Breadcrumb } from './breadcrumb';
import { useSablierProgram } from './sablier-data-access';
import { TableWithTabs } from './table-with-tabs';

export default function VestingFeature() {
	const { publicKey } = useWallet();
	const { programId } = useSablierProgram();

	return (
		<div className="w-full flex flex-col">
			<Breadcrumb />
			<h1 className="text-white text-4xl font-normal px-4 mb-12">Vesting Streams</h1>
			<TableWithTabs />
		</div>
	);
}
