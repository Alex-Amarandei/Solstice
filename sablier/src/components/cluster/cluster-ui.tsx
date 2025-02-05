import { useConnection } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';
import { IconTrash } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { AppModal } from '../ui/ui-layout';
import { ClusterNetwork, useCluster } from './cluster-data-access';

export function ExplorerLink({ path, label, className }: { path: string; label: string; className?: string }) {
	const { getExplorerUrl } = useCluster();

	return (
		<a href={getExplorerUrl(path)} target="_blank" rel="noopener noreferrer" className={className ? className : `link font-mono`}>
			{label}
		</a>
	);
}

export function ClusterChecker({ children }: { children: ReactNode }) {
	const { cluster } = useCluster();
	const { connection } = useConnection();

	const query = useQuery({
		queryKey: ['version', { cluster, endpoint: connection.rpcEndpoint }],
		queryFn: () => connection.getVersion(),
		retry: 1,
	});
	if (query.isLoading) {
		return null;
	}
	if (query.isError || !query.data) {
		// Show a toast with a "Request Airdrop" action
		toast.error(`Error connecting to cluster ${cluster.name}. 🌐`, {
			action: {
				label: 'Refresh 🔄',
				onClick: () => query.refetch(),
			},
		});

		return null;
	}
	return children;
}

export function ClusterUiSelect() {
	const { clusters, setCluster, cluster } = useCluster();

	return (
		<div className="dropdown relative group">
			{/* Dropdown Toggle */}
			<label
				tabIndex={0}
				className="flex items-center justify-center bg-sablier-orange-gradient text-white font-semibold px-4 py-2 rounded-lg cursor-pointer shadow-md hover:bg-sablier-dark-orange transition w-full"
				style={{ minWidth: 'max-content' }}
			>
				{cluster.name}
			</label>

			{/* Dropdown Menu */}
			<ul
				className="hidden opacity-0 translate-y-2 absolute left-1/2 -translate-x-1/2 mt-2 p-2 shadow-lg bg-[#1a1d28] text-white rounded-lg border border-gray-700 group-hover:opacity-100 group-hover:translate-y-0 group-hover:block group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:block transition-all duration-200 ease-in-out"
				style={{ minWidth: 'max-content' }}
			>
				{clusters.map((item) => (
					<li key={item.name} className="text-center">
						<button
							className={`flex items-center justify-center px-4 py-2 rounded-md text-sm w-full ${
								item.active ? 'bg-sablier-dark-orange text-white font-bold' : 'hover:bg-gray-700 hover:scale-105 transition'
							}`}
							onClick={() => setCluster(item)}
						>
							{item.name}
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}

export function ClusterUiModal({ hideModal, show }: { hideModal: () => void; show: boolean }) {
	const { addCluster } = useCluster();
	const [name, setName] = useState('');
	const [network, setNetwork] = useState<ClusterNetwork | undefined>();
	const [endpoint, setEndpoint] = useState('');

	return (
		<AppModal
			title={'Add Cluster'}
			hide={hideModal}
			show={show}
			submit={() => {
				try {
					new Connection(endpoint);
					if (name) {
						addCluster({ name, network, endpoint });
						hideModal();
					} else {
						console.log('Invalid cluster name');
					}
				} catch {
					console.log('Invalid cluster endpoint');
				}
			}}
			submitLabel="Save"
		>
			<input
				type="text"
				placeholder="Name"
				className="input input-bordered w-full"
				value={name}
				onChange={(e) => setName(e.target.value)}
			/>
			<input
				type="text"
				placeholder="Endpoint"
				className="input input-bordered w-full"
				value={endpoint}
				onChange={(e) => setEndpoint(e.target.value)}
			/>
			<select
				className="select select-bordered w-full"
				value={network}
				onChange={(e) => setNetwork(e.target.value as ClusterNetwork)}
			>
				<option value={undefined}>Select a network</option>
				<option value={ClusterNetwork.Devnet}>Devnet</option>
				<option value={ClusterNetwork.Testnet}>Testnet</option>
				<option value={ClusterNetwork.Mainnet}>Mainnet</option>
			</select>
		</AppModal>
	);
}

export function ClusterUiTable() {
	const { clusters, setCluster, deleteCluster } = useCluster();
	return (
		<div className="overflow-x-auto">
			<table className="table border-4 border-separate border-base-300">
				<thead>
					<tr>
						<th>Name/ Network / Endpoint</th>
						<th className="text-center">Actions</th>
					</tr>
				</thead>
				<tbody>
					{clusters.map((item) => (
						<tr key={item.name} className={item?.active ? 'bg-base-200' : ''}>
							<td className="space-y-2">
								<div className="whitespace-nowrap space-x-2">
									<span className="text-xl">
										{item?.active ? (
											item.name
										) : (
											<button title="Select cluster" className="link link-secondary" onClick={() => setCluster(item)}>
												{item.name}
											</button>
										)}
									</span>
								</div>
								<span className="text-xs">Network: {item.network ?? 'custom'}</span>
								<div className="whitespace-nowrap text-gray-500 text-xs">{item.endpoint}</div>
							</td>
							<td className="space-x-2 whitespace-nowrap text-center">
								<button
									disabled={item?.active}
									className="btn btn-xs btn-default btn-outline"
									onClick={() => {
										if (!window.confirm('Are you sure?')) return;
										deleteCluster(item);
									}}
								>
									<IconTrash size={16} />
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
