import { WalletButton } from '../solana/solana-provider';

export function NotConnected() {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen p-8">
			<h1 className="text-5xl font-bold text-white">🛑 Wo-oh, hold up, amigo! 🛑</h1>
			<p className="my-8 text-xl text-white">You need a wallet to proceed. Connect your wallet to get started!</p>
			<WalletButton />
		</div>
	);
}

export function Breadcrumb({ streamId }: { streamId?: string }) {
	return (
		<nav className="text-white py-3 px-4 rounded-lg mb-6 text-sm my-2 w-full">
			<ul className="flex items-center space-x-2 text-left">
				<li className="text-gray-400 hover:text-white transition hover:cursor-pointer">Vesting</li>
				<li className="text-gray-500">&gt;</li>
				<li className="font-medium text-white">
					{streamId ?? 'All'} <span className="text-orange-500">#</span>{' '}
					<span className="text-white">Onchain token vesting. Funds are locked upfront.</span>
				</li>
			</ul>
		</nav>
	);
}
