'use client';

import NotFound from '@/app/not-found';
import { NotConnected } from '@/components/ui/ui-common';
import { useWallet } from '@solana/wallet-adapter-react';
import { useGetStreamById } from './stream-data-access';
import StreamDetailsPage from './stream-ui';

export default function StreamFeature({ streamId }: { streamId: string }) {
	const { publicKey } = useWallet();
	const { stream, isLoading, error } = useGetStreamById(streamId);

	if (!publicKey) {
		return <NotConnected />;
	}

	if (isLoading) {
		return <h1 className="text-white text-5xl">Loading your Stream... ⏳</h1>;
	}

	if (error || !stream) {
		return <NotFound />;
	}

	return <StreamDetailsPage stream={stream} />;
}
