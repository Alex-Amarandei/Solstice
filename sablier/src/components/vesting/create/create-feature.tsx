'use client';

import { NotConnected } from '@/components/ui/ui-common';
import { useWallet } from '@solana/wallet-adapter-react';
import CreateLockupLinearStreamCard from './create-ui';

export default function CreateFeature() {
	const { publicKey } = useWallet();

	if (!publicKey) {
		return <NotConnected />;
	}

	return <CreateLockupLinearStreamCard />;
}
