'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';
import { ExplorerLink } from '../cluster/cluster-ui';
import { WalletButton } from '../solana/solana-provider';
import { AppHero } from '../ui/ui-layout';
import { useSablierProgram } from './sablier-data-access';

const mockStreams = [
	{
		id: 'LL3-42161-1618',
		status: 'Streaming',
		from: '0x5bb50d..918c6a',
		to: '0x3744fa..06e',
		token: 'USDC',
		amount: '10K',
		startTime: 'Oct 01, 2024 @ 2 pm',
		endTime: 'Feb 01, 2025 @ 2 pm',
		vested: '95%',
	},
];

export default function VestingFeature() {
	const { publicKey } = useWallet();
	const { programId } = useSablierProgram();
	const [searchTerm, setSearchTerm] = useState('');
	const [filteredStream, setFilteredStream] = useState<any | null>(null);

	const handleSearch = () => {
		const stream = mockStreams.find((s) => s.id.toLowerCase() === searchTerm.toLowerCase());
		setFilteredStream(stream || null);
	};

	return publicKey ? (
		<div>
			<AppHero
				title="Vesting 🔒"
				subtitle={
					'Search for a stream or create a new one. Stream details are stored on-chain and can be managed through the program.'
				}
			>
				<p className="mb-6 text-sablier-dark-orange border rounded-xl border-sablier-dark-orange py-2 bg-sablier-gray hover:-translate-y-1 transition hover:cursor-pointer">
					<ExplorerLink path={`account/${programId}`} label={programId.toString()} />
				</p>
			</AppHero>
			{/* Search and Table Section */}
			<div className="max-w-7xl mx-auto px-6 py-8">
				<div className="flex justify-between items-center mb-6">
					{/* Search Input */}
					<div className="w-full max-w-md">
						<input
							type="text"
							placeholder="Enter Stream ID"
							className="input input-bordered bg-[#1a1d28] text-white w-full px-4 py-2 rounded-lg border border-gray-700"
							value={searchTerm}
							onChange={(e) => {
								setSearchTerm(e.target.value);
								handleSearch();
							}}
						/>
					</div>
					{/* Create Stream Button */}
					<button className="btn bg-sablier-dark-orange text-white px-6 py-3 rounded-lg hover:bg-orange-500 transition">
						Create Stream +
					</button>
				</div>
				{/* Search Results */}
				{filteredStream ? (
					<div className="bg-[#1a1d28] p-6 rounded-lg shadow-lg border border-gray-700">
						<h2 className="text-xl font-semibold mb-4">{filteredStream.id}</h2>
						<p>
							<strong>Status:</strong> {filteredStream.status}
						</p>
						<p>
							<strong>From:</strong> {filteredStream.from}
						</p>
						<p>
							<strong>To:</strong> {filteredStream.to}
						</p>
						<p>
							<strong>Token:</strong> {filteredStream.token} ({filteredStream.amount})
						</p>
						<p>
							<strong>Timeline:</strong> {filteredStream.startTime} → {filteredStream.endTime}
						</p>
						<p>
							<strong>Vested:</strong> {filteredStream.vested}
						</p>
					</div>
				) : searchTerm ? (
					<p className="text-gray-400">No stream found with the given ID.</p>
				) : null}
			</div>
		</div>
	) : (
		<div className="max-w-4xl mx-auto">
			<div className="hero py-[64px]">
				<div className="hero-content text-center">
					<WalletButton />
				</div>
			</div>
		</div>
	);
}
