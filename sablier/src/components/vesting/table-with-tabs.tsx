import { getElapsedAmount } from '@/utils/math';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatAmount, formatNumberAmount, formatShortenPubkey, formatStreamState, formatTimeline } from '../../utils/formatting';
import { useLockupLinearProgram } from './vesting-data-access';

export function TableWithTabs() {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const { lockupLinearStreams } = useLockupLinearProgram();
	const router = useRouter();

	const tabs = [
		{ id: 'all', label: 'All' },
		{ id: 'search', label: 'Search' },
	];

	const handleTabClick = (tabId: string) => {
		if (tabId === 'search') {
			setIsModalOpen(true);
		}
	};

	return (
		<div className="w-full px-4">
			{/* Tabs */}
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
					className="px-10 py-3 mb-2 bg-sablier-dark-orange text-white font-semibold rounded-lg transition hover:bg-sablier-orange"
					onClick={() => router.push('/vesting/create')}
				>
					Create Stream
				</button>
			</div>

			{/* Table */}
			<div className="overflow-x-auto bg-sablier-black rounded-tr-lg rounded-b-lg shadow-lg">
				<table className="table-auto w-full text-left text-sm text-gray-400">
					<thead>
						<tr className="bg-sablier-gray text-sablier-gray-text">
							<th className="pl-8 pr-4 py-6 font-medium">STATUS</th>
							<th className="px-4 py-6 font-medium">FROM / TO</th>
							<th className="px-4 py-6 font-medium">VALUE</th>
							<th className="px-4 py-6 font-medium">TIMELINE</th>
							<th className="px-4 py-6 font-medium">VESTED</th>
							<th className="px-4 py-6 font-medium">ACTIONS</th>
						</tr>
					</thead>
					<tbody>
						{lockupLinearStreams?.data?.map(({ account, publicKey }) => (
							<tr key={publicKey.toBase58()} className="border-t border-sablier-gray hover:bg-sablier-gray">
								<td className="pl-8 pr-4 py-4">{formatStreamState(account)}</td>
								<td className="px-4 py-4">
									{formatShortenPubkey(account.baseStream.sender)} / {formatShortenPubkey(account.baseStream.recipient)}
								</td>
								<td className="px-4 py-4">{formatAmount(account.baseStream.amounts.deposited)}</td>
								<td className="px-4 py-4">
									{formatTimeline(account.baseStream.startTime, account.baseStream.endTime, account.cliffTime)}
								</td>
								<td className="px-4 py-4">{formatNumberAmount(getElapsedAmount(account))}</td>
								<td className="px-4 py-4">
									<button className="text-orange-500 hover:underline">View</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
