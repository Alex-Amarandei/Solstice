'use client';

import { getElapsedAmount } from '@/utils/math';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
	formatAmount,
	formatNumberAmountWithPrecision,
	formatShortenPubkey,
	formatStreamState,
	formatTimeline,
} from '../../utils/formatting';
import { useLockupLinearProgram } from './vesting-data-access';

/** Utility to truncate a string to `maxLength` characters with trailing '...' */
function smartTruncateString(str: string | undefined, maxLength: number) {
	if (!str) return '';
	return str.length <= maxLength ? str : str.slice(0, maxLength) + '...';
}

export function TableWithTabs() {
	const router = useRouter();
	const { lockupLinearStreams } = useLockupLinearProgram();

	const [isModalOpen, setIsModalOpen] = useState(false);

	// Search fields
	const [searchName, setSearchName] = useState('');
	const [searchId, setSearchId] = useState('');

	// Keep a separate array for filtered streams
	const [filteredStreams, setFilteredStreams] = useState(lockupLinearStreams?.data || []);

	// Whenever the original data changes, reset our filtered array
	useEffect(() => {
		if (lockupLinearStreams?.data) {
			setFilteredStreams(lockupLinearStreams.data);
		}
	}, [lockupLinearStreams?.data]);

	const tabs = [
		{ id: 'all', label: 'All' },
		{ id: 'search', label: 'Search' },
	];

	const handleTabClick = (tabId: string) => {
		if (tabId === 'all') {
			// Reset search fields and show all streams
			setFilteredStreams(lockupLinearStreams?.data || []);
			setSearchName('');
			setSearchId('');
			setIsModalOpen(false);
		} else if (tabId === 'search') {
			setIsModalOpen(true);
		}
	};

	const handleSearch = () => {
		if (!lockupLinearStreams?.data) return;

		const filtered = lockupLinearStreams.data.filter(({ account }) => {
			const streamName = account?.baseStream?.name || '';
			const streamId = account?.baseStream?.id || '';
			const matchesName = !searchName || streamName.toLowerCase().includes(searchName.toLowerCase());
			const matchesId = !searchId || streamId.toLowerCase().includes(searchId.toLowerCase());

			return matchesName && matchesId;
		});

		setFilteredStreams(filtered);
		setIsModalOpen(false);
	};

	return (
		<div className="w-full px-4">
			<div className="flex items-center justify-between">
				<div className="flex">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => handleTabClick(tab.id)}
							className={`relative px-10 py-4 transition ${
								tab.id === 'all'
									? 'bg-sablier-gray text-white border-orange-500 rounded-t-lg border-r-0'
									: 'bg-gray-800 text-sablier-gray-text border-gray-700 hover:text-white rounded-t-lg'
							}`}
						>
							{tab.label}
							{tab.id === 'all' && <div className="absolute left-0 top-0 h-full w-1 bg-orange-500 rounded-tl-lg" />}
						</button>
					))}
				</div>
				<button
					className="px-10 py-3 mb-2 bg-sablier-orange-gradient text-white font-semibold rounded-lg transition hover:bg-sablier-orange"
					onClick={() => router.push('/vesting/create')}
				>
					Create Stream
				</button>
			</div>

			<div className="overflow-x-auto bg-sablier-black rounded-tr-lg rounded-b-lg shadow-lg">
				<table className="table-auto w-full text-left text-sm text-gray-400">
					<thead>
						<tr className="bg-sablier-gray text-sablier-gray-text">
							<th className="pl-8 pr-4 py-6 font-medium">STATUS</th>
							<th className="px-4 py-6 font-medium">FROM / TO</th>
							<th className="px-4 py-6 font-medium">NAME / ID</th>
							<th className="px-4 py-6 font-medium">VALUE</th>
							<th className="px-4 py-6 font-medium">TIMELINE</th>
							<th className="px-4 py-6 font-medium">VESTED</th>
						</tr>
					</thead>
					<tbody>
						{filteredStreams.map(({ account, publicKey }) => {
							const { baseStream } = account;
							const streamName = baseStream?.name || 'Untitled';
							const streamId = baseStream?.id || 'N/A';

							return (
								<tr
									key={publicKey.toBase58()}
									onClick={() => router.push(`/vesting/stream/${streamId}`)}
									className="border-t border-sablier-gray cursor-pointer transition-transform duration-300 hover:scale-[1.02] hover:bg-sablier-gray"
								>
									<td className="pl-8 pr-4 py-4">{formatStreamState(account)}</td>
									<td className="px-4 py-4">
										{formatShortenPubkey(baseStream.sender)} / {formatShortenPubkey(baseStream.recipient)}
									</td>
									<td className="px-4 py-4">
										{smartTruncateString(streamName, 20)} ({smartTruncateString(streamId, 10)})
									</td>
									<td className="px-4 py-4">{formatAmount(baseStream.amounts.deposited)}</td>
									<td className="px-4 py-4">
										{formatTimeline(baseStream.startTime, baseStream.endTime, account.cliffTime)}
									</td>
									<td className="px-4 py-4">{formatNumberAmountWithPrecision(getElapsedAmount(account), 2)}</td>
								</tr>
							);
						})}
						{filteredStreams.length === 0 && (
							<tr>
								<td colSpan={6} className="text-center py-6 text-gray-500">
									No streams found.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{/* Search Modal */}
			{isModalOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
					onClick={() => setIsModalOpen(false)}
				>
					<div
						className="bg-sablier-gray p-8 rounded-lg w-11/12 max-w-3xl h-auto max-h-[80vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<h2 className="text-white text-xl mb-6">Search Streams</h2>
						<div className="mb-6">
							<label className="block text-sm text-sablier-gray-text mb-2">Name</label>
							<input
								type="text"
								value={searchName}
								onChange={(e) => setSearchName(e.target.value)}
								className="w-full p-3 rounded bg-gray-700 text-white"
								placeholder="Enter name"
							/>
						</div>
						<div className="mb-8">
							<label className="block text-sm text-sablier-gray-text mb-2">ID</label>
							<input
								type="text"
								value={searchId}
								onChange={(e) => setSearchId(e.target.value)}
								className="w-full p-3 rounded bg-gray-700 text-white"
								placeholder="Enter stream ID"
							/>
						</div>
						<div className="flex justify-end space-x-4">
							<button
								onClick={() => setIsModalOpen(false)}
								className="px-4 py-2 text-sm text-white bg-gray-600 rounded hover:bg-gray-500"
							>
								Cancel
							</button>
							<button
								onClick={handleSearch}
								className="px-4 py-2 text-sm text-white bg-sablier-orange-gradient rounded hover:bg-sablier-orange"
							>
								Search
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
