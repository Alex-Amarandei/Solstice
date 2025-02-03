'use client';

interface CounterCreateProps {
	onCreate: () => void;
	isPending: boolean;
}

interface CounterListProps {
	authority: string;
	index: number;
}

export function CounterCreate({ onCreate, isPending }: CounterCreateProps) {
	return (
		<div className="text-center text-white">
			<h1 className="text-5xl font-bold">🚀 Initialize Stream Counter 🚀</h1>
			<p className="mt-4 text-xl">⚠️ Beware: Only authorized personnel can interact with this page! ⚠️</p>
			<button
				onClick={onCreate}
				disabled={isPending}
				className="mt-8 px-6 py-3 text-lg font-semibold bg-sablier-orange-gradient rounded-lg shadow-md disabled:opacity-50"
			>
				{isPending ? 'Creating...' : 'Create Counter'}
			</button>
		</div>
	);
}

export function CounterList({ authority, index }: CounterListProps) {
	return (
		<div className="w-2/3 bg-sablier-gray p-8 rounded-lg shadow-sm shadow-sablier-dark-orange text-white">
			<h1 className="text-4xl font-bold text-center">Stream Counter</h1>
			<div className="mt-8 p-6 bg-sablier-input rounded-lg shadow-inner border-sablier-gray-text border-2">
				<h2 className="text-2xl font-semibold text-center">Lockup Linear Stream Counter</h2>
				<div className="mt-6 space-y-4">
					<div className="flex items-center justify-between">
						<span className="text-lg font-medium">Authority:</span>
						<span className="text-lg font-mono">{authority}</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-lg font-medium">Index:</span>
						<span className="text-lg font-mono">{index}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
