import { useState } from 'react';
import { toast } from 'sonner';

export function TableWithTabs() {
	const [activeTab, setActiveTab] = useState('all');
	const [isModalOpen, setIsModalOpen] = useState(false);

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
					onClick={() => toast.info('Create Stream')}
				>
					Create Stream
				</button>
			</div>

			{/* Modal for Search */}
			{isModalOpen && (
				<div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50">
					<div className="bg-gray-800 p-6 rounded-lg w-1/3">
						<h2 className="text-white text-lg mb-4">Search Stream</h2>
						<input
							type="text"
							placeholder="Enter Stream ID"
							className="input input-bordered w-full bg-gray-900 text-white p-3 rounded-lg mb-4 border-gray-700"
						/>
						<div className="flex justify-end space-x-4">
							<button className="btn bg-gray-700 text-gray-400 px-6 py-2 rounded-lg" onClick={() => setIsModalOpen(false)}>
								Cancel
							</button>
							<button className="btn bg-orange-500 text-white px-6 py-2 rounded-lg">Search</button>
						</div>
					</div>
				</div>
			)}

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
						{/* Example Row */}
						<tr className="border-t border-sablier-gray hover:bg-sablier-gray">
							<td className="pl-8 pr-4 py-4">Streaming</td>
							<td className="px-4 py-4">0x123...789 / 0xabc...def</td>
							<td className="px-4 py-4">$10,000</td>
							<td className="px-4 py-4">Oct 2024 - Feb 2025</td>
							<td className="px-4 py-4">50%</td>
							<td className="px-4 py-4">
								<button className="text-orange-500 hover:underline">View</button>
							</td>
						</tr>
						<tr className="border-t border-sablier-gray hover:bg-sablier-gray">
							<td className="pl-8 pr-4 py-4">Streaming</td>
							<td className="px-4 py-4">0x123...789 / 0xabc...def</td>
							<td className="px-4 py-4">$10,000</td>
							<td className="px-4 py-4">Oct 2024 - Feb 2025</td>
							<td className="px-4 py-4">50%</td>
							<td className="px-4 py-4">
								<button className="text-orange-500 hover:underline">View</button>
							</td>
						</tr>
						<tr className="border-t border-sablier-gray hover:bg-sablier-gray">
							<td className="pl-8 pr-4 py-4">Streaming</td>
							<td className="px-4 py-4">0x123...789 / 0xabc...def</td>
							<td className="px-4 py-4">$10,000</td>
							<td className="px-4 py-4">Oct 2024 - Feb 2025</td>
							<td className="px-4 py-4">50%</td>
							<td className="px-4 py-4">
								<button className="text-orange-500 hover:underline">View</button>
							</td>
						</tr>

						{/* Add more rows as needed */}
					</tbody>
				</table>
			</div>
		</div>
	);
}
