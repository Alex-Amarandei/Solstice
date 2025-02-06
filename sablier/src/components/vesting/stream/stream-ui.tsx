'use client';

import { useCluster } from '@/components/cluster/cluster-data-access';
import { Breadcrumb } from '@/components/ui/ui-common';
import { LockupLinearStream } from '@/types/lockup-linear';
import {
	formatAmount,
	formatCancelabilityStatus,
	formatDate,
	formatNumberAmount,
	formatNumberAmountWithPrecision,
	formatPercentage,
	formatShortenPubkey,
	formatStartStatus,
	formatStreamState,
} from '@/utils/formatting';
import {
	addDecimals,
	canBeWithdrawnFrom,
	getElapsedAmount,
	getElapsedPercentage,
	getExpectedPayout,
	getWithdrawableAmount,
	getWithdrawnPercentage,
} from '@/utils/math';
import { PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useLockupLinearProgram } from '../vesting-data-access';

export default function StreamDetailsPage({ stream }: { stream: LockupLinearStream }) {
	const { cluster } = useCluster();
	const [_, setCurrentTime] = useState(() => Date.now());
	const [isWithdrawDrawerOpen, setIsWithdrawDrawerOpen] = useState(false);
	const [withdrawAmount, setWithdrawAmount] = useState('');
	const [maxUsed, setMaxUsed] = useState(false);

	const { cancelLockupLinearStream, renounceCancelabilityLockupLinearStream, withdrawFromLockupLinearStream } = useLockupLinearProgram();

	const cancelOnClick = ({ streamId, tokenMint }: { streamId: string; tokenMint: PublicKey }) => {
		cancelLockupLinearStream.mutateAsync({ streamId, tokenMint });
	};

	const renounceOnClick = (streamId: string) => {
		renounceCancelabilityLockupLinearStream.mutateAsync(streamId);
	};

	const openWithdrawDrawer = () => {
		if (!canBeWithdrawnFrom(stream)) return;
		setIsWithdrawDrawerOpen(true);
		setWithdrawAmount('');
	};
	const closeWithdrawDrawer = () => setIsWithdrawDrawerOpen(false);

	const handleMaxClick = () => {
		setMaxUsed(true);
		const maxAmount = formatNumberAmountWithPrecision(getWithdrawableAmount(stream), 5);
		setWithdrawAmount(maxAmount.toString());
	};

	const handleWithdraw = () => {
		let parsedAmount = addDecimals(parseFloat(withdrawAmount));
		const withdrawableAmount = getWithdrawableAmount(stream);

		if (isNaN(parsedAmount) || parsedAmount <= 0 || (!maxUsed && parsedAmount > withdrawableAmount)) {
			toast.error('Invalid amount');
			return;
		}

		if (maxUsed) {
			parsedAmount = withdrawableAmount;
		}

		withdrawFromLockupLinearStream.mutateAsync({
			amount: parsedAmount,
			streamId: stream.baseStream.id,
			tokenMint: stream.baseStream.tokenMint,
		});

		closeWithdrawDrawer();
	};

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				closeWithdrawDrawer();
			}
		}
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);

	useEffect(() => {
		const intervalId = setInterval(() => {
			setCurrentTime(Date.now());
		}, 200);
		return () => clearInterval(intervalId);
	}, []);

	return (
		<div className="min-h-screen w-full text-white relative">
			<Breadcrumb crumb={stream.baseStream.id} />

			<div className="flex flex-col md:flex-row gap-6 p-6">
				<main className="md:w-3/5 flex flex-col items-center justify-center">
					<div className="w-5/6 aspect-square relative">
						<CircleDisplay stream={stream} />
					</div>
				</main>

				<aside className="md:w-2/5 flex flex-col gap-4">
					<StreamHeader stream={stream} />
					<AttributesCard stream={stream} clusterName={cluster.name} />
					<ActionsCard
						stream={stream}
						cancelOnClick={cancelOnClick}
						renounceOnClick={renounceOnClick}
						onWithdrawClick={openWithdrawDrawer}
					/>
				</aside>
			</div>

			<WithdrawDrawer
				isOpen={isWithdrawDrawerOpen}
				onClose={closeWithdrawDrawer}
				withdrawAmount={withdrawAmount}
				setMaxUsed={setMaxUsed}
				setWithdrawAmount={setWithdrawAmount}
				handleMaxClick={handleMaxClick}
				handleWithdraw={handleWithdraw}
			/>
		</div>
	);
}

function WithdrawDrawer({
	isOpen,
	onClose,
	withdrawAmount,
	setWithdrawAmount,
	setMaxUsed,
	handleMaxClick,
	handleWithdraw,
}: {
	isOpen: boolean;
	onClose: () => void;
	withdrawAmount: string;
	setWithdrawAmount: (val: string) => void;
	setMaxUsed: (val: boolean) => void;
	handleMaxClick: () => void;
	handleWithdraw: () => void;
}) {
	return (
		<div
			className={`
        fixed inset-0 z-40 flex justify-end 
        bg-black bg-opacity-40 backdrop-blur-sm
        transition-opacity duration-300
        ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
      `}
			onClick={onClose}
		>
			<div
				onClick={(e) => e.stopPropagation()}
				className={`
          relative h-screen w-full md:w-[400px] bg-sablier-card shadow-lg z-50 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
			>
				<div className="flex items-center justify-between p-4 border-b border-slate-700">
					<h2 className="text-xl font-bold">Withdraw</h2>
					<button
						className="text-white text-xl font-light px-2 py-1 hover:bg-slate-800 rounded"
						onClick={onClose}
						aria-label="Close Withdraw Drawer"
					>
						&times;
					</button>
				</div>

				<div className="p-4">
					<label className="block mb-2 font-semibold">Amount to withdraw</label>
					<div className="flex items-center gap-2">
						<input
							type="number"
							className="w-full px-3 py-2 rounded bg-sablier-black border border-sablier-gray focus:outline-none"
							value={withdrawAmount}
							onChange={(e) => {
								setWithdrawAmount(e.target.value);
								setMaxUsed(false);
							}}
						/>
						<button
							className="px-4 py-2 rounded bg-sablier-blue-gradient text-white font-semibold transition"
							onClick={handleMaxClick}
						>
							Max
						</button>
					</div>

					<div className="mt-8">
						<button
							className="w-full bg-sablier-orange-gradient text-white font-semibold transition px-4 py-2 rounded"
							onClick={handleWithdraw}
						>
							Withdraw
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

function CircleDisplay({ stream }: { stream: LockupLinearStream }) {
	const depositAmount = formatAmount(stream.baseStream.amounts.deposited);
	const withdrawnAmount = formatAmount(stream.baseStream.amounts.withdrawn);
	const streamedAmount = formatNumberAmount(getElapsedAmount(stream));

	const streamedPct = depositAmount ? (streamedAmount / depositAmount) * 100 : 0;
	const withdrawnPct = depositAmount ? (withdrawnAmount / depositAmount) * 100 : 0;

	const outerRadius = 42;
	const outerStrokeWidth = 4;
	const outerCircumference = 2 * Math.PI * outerRadius;
	const outerOffset = outerCircumference - (outerCircumference * streamedPct) / 100;

	const innerRadius = 32;
	const innerStrokeWidth = 4;
	const innerCircumference = 2 * Math.PI * innerRadius;
	const innerOffset = innerCircumference - (innerCircumference * withdrawnPct) / 100;

	return (
		<div className="absolute inset-0 flex flex-col items-center">
			<svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
				<defs>
					<linearGradient id="secondaryGradient" x1="0" y1="0" x2="1" y2="0">
						<stop offset="0%" stopColor="#003dff" />
						<stop offset="50%" stopColor="#0063ff" />
						<stop offset="100%" stopColor="#00b7ff" />
					</linearGradient>
					<linearGradient id="primaryGradient" x1="0" y1="0" x2="1" y2="0">
						<stop offset="0%" stopColor="#ff7300" />
						<stop offset="50%" stopColor="#ff9c00" />
						<stop offset="100%" stopColor="#ffb800" />
					</linearGradient>
					<filter id="outerGlow" x="-50%" y="-50%" width="200%" height="200%">
						<feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#0063ff" floodOpacity="0.7" />
					</filter>
					<filter id="innerGlow" x="-50%" y="-50%" width="200%" height="200%">
						<feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ff9c00" floodOpacity="0.7" />
					</filter>
				</defs>

				<circle cx="50" cy="50" r={outerRadius} strokeWidth={outerStrokeWidth} stroke="#2f2f2f" fill="none" />
				<circle
					cx="50"
					cy="50"
					r={outerRadius}
					strokeWidth={outerStrokeWidth}
					stroke="url(#secondaryGradient)"
					fill="none"
					strokeDasharray={outerCircumference}
					strokeDashoffset={outerOffset}
					strokeLinecap="round"
					filter="url(#outerGlow)"
				/>

				<circle cx="50" cy="50" r={innerRadius} strokeWidth={innerStrokeWidth} stroke="#2f2f2f" fill="none" />
				<circle
					cx="50"
					cy="50"
					r={innerRadius}
					strokeWidth={innerStrokeWidth}
					stroke="url(#primaryGradient)"
					fill="none"
					strokeDasharray={innerCircumference}
					strokeDashoffset={innerOffset}
					strokeLinecap="round"
					filter="url(#innerGlow)"
				/>
			</svg>

			<div className="absolute inset-0 flex flex-col items-center justify-center">
				<div className="w-full h-[100px] rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg shadow-white/10 flex flex-col items-center justify-center">
					<span className="text-5xl font-bold text-white">{formatNumberAmountWithPrecision(getElapsedAmount(stream), 5)}</span>
				</div>
				<span className="mt-1 text-gray-200">{`out of ${formatAmount(stream.baseStream.amounts.deposited)}`}</span>
			</div>
		</div>
	);
}

function StreamHeader({ stream }: { stream: LockupLinearStream }) {
	return (
		<div>
			<h2 className="text-2xl font-bold">{`${stream.baseStream.name} (${stream.baseStream.id})`}</h2>
		</div>
	);
}

function AttributesCard({ stream, clusterName }: { stream: LockupLinearStream; clusterName: string }) {
	return (
		<div className="bg-sablier-card rounded-lg p-8 flex flex-col gap-8">
			<div className="flex items-center justify-between gap-2">
				<span className="text-base font-light text-sablier-gray-text">From:</span>
				<span className="text-base font-semibold text-sablier-orange">{formatShortenPubkey(stream.baseStream.sender)}</span>
				<span className="text-base text-sablier-gray-text">&gt;</span>
				<span className="text-base font-light text-sablier-gray-text">To:</span>
				<span className="text-base font-semibold text-green-600">{formatShortenPubkey(stream.baseStream.recipient)}</span>
			</div>

			<hr className="border-sablier-gray border-2" />

			<div className="grid grid-cols-2 gap-4">
				<AttributeItem
					label="Shape"
					value={`Lockup Linear${stream.cliffTime !== stream.baseStream.startTime ? ' with Cliff' : ''}`}
				/>
				<AttributeItem label="Status" value={formatStreamState(stream)} />
				<AttributeItem label="Expected Payout" value={formatNumberAmountWithPrecision(getExpectedPayout(stream), 5).toString()} />
				<AttributeItem label="Cancelability" value={formatCancelabilityStatus(stream)} />
				<AttributeItem label="Cluster" value={clusterName} />
				<AttributeItem label={formatStartStatus(stream.baseStream.startTime)} value={formatDate(stream.baseStream.startTime)} />
			</div>

			<hr className="border-sablier-gray border-2" />

			<div className="flex flex-col gap-3">
				<div className="flex items-center justify-between text-base">
					<span className="font-light text-sablier-gray-text">Streamed amount:</span>
					<span className="font-semibold text-sablier-blue-200">{formatPercentage(getElapsedPercentage(stream))}</span>
				</div>
				<div className="flex items-center justify-between text-base">
					<span className="font-light text-sablier-gray-text">Withdrawn amount:</span>
					<span className="font-semibold text-sablier-orange">{formatPercentage(getWithdrawnPercentage(stream))}</span>
				</div>
			</div>
		</div>
	);
}

function AttributeItem({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col text-sm">
			<span className="text-sablier-gray-text font-light">{label}</span>
			<span className="text-base font-medium">{value}</span>
		</div>
	);
}

function ActionsCard({
	stream,
	cancelOnClick,
	renounceOnClick,
	onWithdrawClick,
}: {
	stream: LockupLinearStream;
	cancelOnClick: ({ streamId, tokenMint }: { streamId: string; tokenMint: PublicKey }) => void;
	renounceOnClick: (streamId: string) => void;
	onWithdrawClick: () => void;
}) {
	return (
		<div className="bg-sablier-card rounded-lg p-8 flex flex-col gap-6">
			<h3 className="text-lg text-sablier-gray-text font-bold">Actions</h3>
			<div className="flex flex-col gap-3 text-base">
				<ActionItem label="Withdraw" locked={!canBeWithdrawnFrom(stream)} onClick={onWithdrawClick} />
				<ActionItem
					label="Cancel"
					locked={formatCancelabilityStatus(stream) !== 'Yes'}
					onClick={() => {
						cancelOnClick({ streamId: stream.baseStream.id, tokenMint: stream.baseStream.tokenMint });
					}}
				/>
				<ActionItem
					label="Renounce Cancelability"
					locked={formatCancelabilityStatus(stream) !== 'Yes'}
					onClick={() => {
						renounceOnClick(stream.baseStream.id);
					}}
				/>
			</div>
		</div>
	);
}

function ActionItem({ label, locked, onClick }: { label: string; locked?: boolean; onClick?: () => void }) {
	return (
		<button
			className={`
        w-full px-4 py-2 rounded-lg text-left font-semibold border-2 border-sablier-gray
        hover:bg-sablier-black transition-colors
        ${locked ? 'opacity-50 cursor-not-allowed' : ''}
      `}
			onClick={locked ? undefined : onClick}
		>
			{label} {locked ? '🔒' : ''}
		</button>
	);
}
