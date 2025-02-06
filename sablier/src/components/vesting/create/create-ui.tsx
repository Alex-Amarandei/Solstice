import { useCluster } from '@/components/cluster/cluster-data-access';
import { Breadcrumb } from '@/components/ui/ui-common';
import { LockupLinearStreamState, TimeTuple } from '@/types/state';
import { EMPTY_CLIFF, EMPTY_DURATION, EMPTY_STREAM } from '@/utils/constants';
import { toCreateLockupLinearStreamArgs } from '@/utils/conversion';
import { formatShortenString } from '@/utils/formatting';
import { isCreateStreamDataValid } from '@/utils/validation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useLockupLinearProgram } from '../vesting-data-access';

export default function CreateLockupLinearStreamCard() {
	const [stream, setStream] = useState<LockupLinearStreamState>(EMPTY_STREAM);
	const { cluster } = useCluster();
	const [duration, setDuration] = useState(EMPTY_DURATION);
	const [cliff, setCliff] = useState(EMPTY_CLIFF);

	const { createLockupLinearStream } = useLockupLinearProgram();

	const onCreateStream = async () => {
		try {
			if (!isCreateStreamDataValid(stream, duration, cliff)) {
				return;
			}

			const createArgs = toCreateLockupLinearStreamArgs(stream, duration, cliff);
			await createLockupLinearStream.mutateAsync(createArgs);
		} catch (error) {
			console.error('Error creating stream:', error);
			toast.error('Failed to create stream. Check console for details.');
		}
	};

	return (
		<div className="min-h-screen w-full text-white">
			<Breadcrumb crumb="Create Lockup Linear Stream" />

			<div className="flex flex-col md:flex-row px-8 py-8 gap-6">
				<LeftColumn
					stream={stream}
					setStream={setStream}
					duration={duration}
					setDuration={setDuration}
					cliff={cliff}
					setCliff={setCliff}
				/>
				<RightSummary stream={stream} onCreateStream={onCreateStream} clusterName={cluster.name} />
			</div>
		</div>
	);
}

function LeftColumn({
	stream,
	setStream,
	duration,
	setDuration,
	cliff,
	setCliff,
}: {
	stream: LockupLinearStreamState;
	setStream: (stream: LockupLinearStreamState) => void;
	duration: TimeTuple;
	setDuration: (duration: TimeTuple) => void;
	cliff: TimeTuple;
	setCliff: (cliff: TimeTuple) => void;
}) {
	const [isDurationMode, setIsDurationMode] = useState(false);

	const toggleMode = () => {
		setIsDurationMode(!isDurationMode);

		setStream({
			baseStream: {
				...stream.baseStream,
				startTime: '',
				endTime: '',
			},
			cliffTime: '',
		});
	};

	return (
		<div className="flex-1 flex flex-col space-y-6">
			<h1 className="text-2xl font-semibold">Create Lockup Linear Stream</h1>

			<div className="bg-sablier-card rounded-lg p-6 shadow-md space-y-6">
				<h2 className="text-lg font-medium mb-2">General Details</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Name stream={stream} setStream={setStream} />
					<TokenMint stream={stream} setStream={setStream} />

					<CancelabilityToggle stream={stream} setStream={setStream} />
					<TransferabilityToggle stream={stream} setStream={setStream} />
				</div>
			</div>

			<div className="bg-sablier-card rounded-lg p-6 shadow-md space-y-6">
				<h2 className="text-lg font-medium">Stream</h2>

				<Amount stream={stream} setStream={setStream} />

				<Recipient stream={stream} setStream={setStream} />

				{/* Duration */}
				<div className="mb-4">
					<label className="block text-sm text-sablier-gray-text mb-1">Duration</label>

					{/* Container row (fills entire width) */}
					<div className="flex w-full space-x-2">
						<div className="flex flex-1 items-center space-x-2">
							{!isDurationMode ? (
								<FixedDateDuration stream={stream} setStream={setStream} />
							) : (
								<TimeDuration duration={duration} setDuration={setDuration} />
							)}
						</div>

						<button
							type="button"
							onClick={toggleMode}
							className="h-12 px-4 rounded-lg bg-sablier-gray border border-transparent
                             text-sablier-gray-text hover:bg-sablier-black transition
                             focus:outline-none"
						>
							{isDurationMode ? 'Use Fixed Dates' : 'Use Duration'}
						</button>
					</div>
				</div>

				<div>
					<label className="block text-sm text-sablier-gray-text mb-1">Cliff Duration</label>
					{!isDurationMode ? (
						<FixedDateCliff stream={stream} setStream={setStream} />
					) : (
						<TimeCliff cliff={cliff} setCliff={setCliff} />
					)}
				</div>
			</div>
		</div>
	);
}

function RightSummary({
	stream,
	onCreateStream,
	clusterName,
}: {
	stream: LockupLinearStreamState;
	onCreateStream: () => void;
	clusterName: string;
}) {
	return (
		<div className="w-full md:w-80 bg-sablier-card rounded-lg p-6 shadow-md h-fit mt-14">
			<h3 className="text-base font-semibold mb-3">Summary</h3>
			<div className="text-sm text-sablier-gray-text space-y-2">
				<div className="flex justify-between">
					<span>Chain</span>
					<span className="text-sablier-gray-text">{`Solana (${clusterName})`}</span>
				</div>
				<div className="flex justify-between">
					<span>Cancelability</span>
					<span className="text-sablier-gray-text">{stream.baseStream.isCancelable ? 'Yes, will be cancelable' : 'No'}</span>
				</div>
				<div className="flex justify-between">
					<span>Transferability</span>
					<span className="text-sablier-gray-text">{stream.baseStream.isTransferable ? 'Yes, will be transferable' : 'No'}</span>
				</div>
				<div className="flex justify-between">
					<span>Token</span>
					<span className="text-sablier-gray-text">
						{stream.baseStream.tokenMint ? formatShortenString(stream.baseStream.tokenMint) : '-'}
					</span>
				</div>
			</div>

			<hr className="border-gray-700 my-4" />
			<div className="text-sm text-sablier-gray-text space-y-2">
				<p className="font-medium">Stream</p>
				<p className="text-sablier-gray-text">Fill in the form to enable the full summary</p>
			</div>

			<hr className="border-gray-700 my-4" />
			<div className="flex justify-between items-center">
				<span className="text-sm text-sablier-gray-text">Total</span>
				<span className="text-md font-semibold text-gray-100">{stream.baseStream.amount}</span>
			</div>
			<p className="text-xs text-gray-500">Excluding gas</p>

			<button
				onClick={onCreateStream}
				className="w-full mt-4 bg-sablier-orange-gradient
                       text-white font-semibold py-3 px-6 rounded-lg
                       transition-colors"
			>
				Create Stream
			</button>
		</div>
	);
}

function CancelabilityToggle({
	stream,
	setStream,
}: {
	stream: LockupLinearStreamState;
	setStream: (stream: LockupLinearStreamState) => void;
}) {
	return (
		<div className="flex flex-col">
			<label className="text-sm text-sablier-gray-text mb-1">Make the stream cancelable?</label>
			<div className="flex items-center justify-between bg-sablier-gray px-3 py-2 rounded-lg">
				<span>{stream.baseStream.isCancelable ? 'Cancelable' : 'Not Cancelable'}</span>
				<div className="flex items-center space-x-2">
					<span
						onClick={() =>
							setStream({
								...stream,
								baseStream: {
									...stream.baseStream,
									isCancelable: true,
								},
							})
						}
						className={`cursor-pointer px-2 py-1 text-sm rounded-lg ${
							stream.baseStream.isCancelable
								? 'bg-sablier-orange-gradient text-white font-semibold'
								: 'bg-sablier-shadow text-sablier-gray-text'
						}`}
					>
						On
					</span>
					<span
						onClick={() =>
							setStream({
								...stream,
								baseStream: {
									...stream.baseStream,
									isCancelable: false,
								},
							})
						}
						className={`cursor-pointer px-2 py-1 text-sm rounded-lg ${
							!stream.baseStream.isCancelable
								? 'bg-sablier-orange-gradient text-white font-semibold'
								: 'bg-sablier-shadow text-sablier-gray-text'
						}`}
					>
						Off
					</span>
				</div>
			</div>
		</div>
	);
}

function TokenMint({ stream, setStream }: { stream: LockupLinearStreamState; setStream: (stream: LockupLinearStreamState) => void }) {
	return (
		<div className="flex flex-col">
			<label className="text-sm text-sablier-gray-text mb-1">Token</label>
			<div className="flex items-center space-x-2">
				<input
					type="text"
					placeholder="Choose a token mint..."
					value={stream.baseStream.tokenMint}
					onChange={(e) =>
						setStream({
							...stream,
							baseStream: {
								...stream.baseStream,
								tokenMint: e.target.value,
							},
						})
					}
					className="flex-1 rounded-lg bg-sablier-gray px-3 py-2 border border-transparent focus:outline-none focus:border-sablier-orange"
				/>
				<button className="bg-sablier-orange-gradient text-white font-semibold text-sm px-3 py-2 rounded-lg">Choose</button>
			</div>
		</div>
	);
}

function Name({ stream, setStream }: { stream: LockupLinearStreamState; setStream: (stream: LockupLinearStreamState) => void }) {
	return (
		<div className="flex flex-col">
			<label className="text-sm text-sablier-gray-text mb-1">Name</label>
			<input
				type="text"
				placeholder="Choose a name for this Stream..."
				value={stream.baseStream.name}
				onChange={(e) =>
					setStream({
						...stream,
						baseStream: {
							...stream.baseStream,
							name: e.target.value,
						},
					})
				}
				className="flex-1 rounded-lg bg-sablier-gray px-3 py-2 border border-transparent focus:outline-none focus:border-sablier-orange"
			/>
		</div>
	);
}

function TransferabilityToggle({
	stream,
	setStream,
}: {
	stream: LockupLinearStreamState;
	setStream: (stream: LockupLinearStreamState) => void;
}) {
	return (
		<div className="flex flex-col">
			<label className="text-sm text-sablier-gray-text mb-1">Make the stream transferable?</label>
			<div className="flex items-center justify-between bg-sablier-gray px-3 py-2 rounded-lg">
				<span>{stream.baseStream.isTransferable ? 'Transferable' : 'Not Transferable'}</span>
				<div className="flex items-center space-x-2">
					<span
						onClick={() =>
							setStream({
								...stream,
								baseStream: {
									...stream.baseStream,
									isTransferable: true,
								},
							})
						}
						className={`cursor-pointer px-2 py-1 text-sm rounded-lg ${
							stream.baseStream.isTransferable
								? 'bg-sablier-orange-gradient text-white'
								: 'bg-sablier-shadow text-sablier-gray-text'
						}`}
					>
						On
					</span>
					<span
						onClick={() =>
							setStream({
								...stream,
								baseStream: {
									...stream.baseStream,
									isTransferable: false,
								},
							})
						}
						className={`cursor-pointer px-2 py-1 text-sm rounded-lg ${
							!stream.baseStream.isTransferable
								? 'bg-sablier-orange-gradient text-white'
								: 'bg-sablier-shadow text-sablier-gray-text'
						}`}
					>
						Off
					</span>
				</div>
			</div>
		</div>
	);
}

function Amount({ stream, setStream }: { stream: LockupLinearStreamState; setStream: (stream: LockupLinearStreamState) => void }) {
	return (
		<div>
			<label className="block text-sm text-sablier-gray-text mb-1">Amount</label>
			<input
				type="number"
				placeholder="Fill in a non-zero amount..."
				value={stream.baseStream.amount}
				onChange={(e) =>
					setStream({
						...stream,
						baseStream: {
							...stream.baseStream,
							amount: Number(e.target.value),
						},
					})
				}
				className="w-full rounded-lg bg-sablier-gray px-3 py-2 border border-transparent focus:outline-none focus:border-sablier-orange"
			/>
		</div>
	);
}

function Recipient({ stream, setStream }: { stream: LockupLinearStreamState; setStream: (stream: LockupLinearStreamState) => void }) {
	return (
		<div>
			<label className="block text-sm text-sablier-gray-text mb-1">Recipient (Public Key)</label>
			<input
				type="text"
				placeholder="Fill in an address..."
				value={stream.baseStream.recipient}
				onChange={(e) =>
					setStream({
						...stream,
						baseStream: {
							...stream.baseStream,
							recipient: e.target.value,
						},
					})
				}
				className="w-full rounded-lg bg-sablier-gray px-3 py-2 border border-transparent focus:outline-none focus:border-sablier-orange"
			/>
		</div>
	);
}

function FixedDateDuration({
	stream,
	setStream,
}: {
	stream: LockupLinearStreamState;
	setStream: (stream: LockupLinearStreamState) => void;
}) {
	return (
		<>
			<input
				type="datetime-local"
				placeholder="Start time"
				value={stream.baseStream.startTime}
				onChange={(e) =>
					setStream({
						...stream,
						baseStream: {
							...stream.baseStream,
							startTime: e.target.value,
						},
					})
				}
				className="h-12 w-full rounded-lg bg-sablier-gray px-3 py-2
                                   border border-transparent focus:outline-none
                                   focus:border-sablier-orange"
			/>
			<input
				type="datetime-local"
				placeholder="End time"
				value={stream.baseStream.endTime}
				onChange={(e) =>
					setStream({
						...stream,
						baseStream: {
							...stream.baseStream,
							endTime: e.target.value,
						},
					})
				}
				className="h-12 w-full rounded-lg bg-sablier-gray px-3 py-2
                                   border border-transparent focus:outline-none
                                   focus:border-sablier-orange"
			/>
		</>
	);
}

function TimeDuration({ duration, setDuration }: { duration: TimeTuple; setDuration: (duration: TimeTuple) => void }) {
	return (
		<>
			<input
				type="number"
				placeholder="Days"
				value={duration.days}
				onChange={(e) =>
					setDuration({
						...duration,
						days: e.target.value,
					})
				}
				className="h-12 w-full rounded-lg bg-sablier-gray px-3 py-2
                                   border border-transparent focus:outline-none
                                   focus:border-sablier-orange"
			/>
			<input
				type="number"
				placeholder="Hours"
				value={duration.hours}
				onChange={(e) =>
					setDuration({
						...duration,
						hours: e.target.value,
					})
				}
				className="h-12 w-full rounded-lg bg-sablier-gray px-3 py-2
                                   border border-transparent focus:outline-none
                                   focus:border-sablier-orange"
			/>
			<input
				type="number"
				placeholder="Minutes"
				value={duration.minutes}
				onChange={(e) =>
					setDuration({
						...duration,
						minutes: e.target.value,
					})
				}
				className="h-12 w-full rounded-lg bg-sablier-gray px-3 py-2
                                   border border-transparent focus:outline-none
                                   focus:border-sablier-orange"
			/>
		</>
	);
}

function FixedDateCliff({ stream, setStream }: { stream: LockupLinearStreamState; setStream: (stream: LockupLinearStreamState) => void }) {
	return (
		<input
			type="datetime-local"
			placeholder="Choose the cliff date/time..."
			value={stream.cliffTime}
			onChange={(e) => setStream({ ...stream, cliffTime: e.target.value })}
			className="w-full h-12 rounded-lg bg-sablier-gray px-3 py-2
                             border border-transparent focus:outline-none
                             focus:border-sablier-orange"
		/>
	);
}

function TimeCliff({ cliff, setCliff }: { cliff: TimeTuple; setCliff: (cliff: TimeTuple) => void }) {
	return (
		<div className="flex space-x-2">
			<input
				type="number"
				placeholder="Days"
				value={cliff.days}
				onChange={(e) =>
					setCliff({
						...cliff,
						days: e.target.value,
					})
				}
				className="w-full h-12 rounded-lg bg-sablier-gray px-3 py-2
                               border border-transparent focus:outline-none
                               focus:border-sablier-orange"
			/>
			<input
				type="number"
				placeholder="Hours"
				value={cliff.hours}
				onChange={(e) =>
					setCliff({
						...cliff,
						hours: e.target.value,
					})
				}
				className="w-full h-12 rounded-lg bg-sablier-gray px-3 py-2
                               border border-transparent focus:outline-none
                               focus:border-sablier-orange"
			/>
			<input
				type="number"
				placeholder="Minutes"
				value={cliff.minutes}
				onChange={(e) =>
					setCliff({
						...cliff,
						minutes: e.target.value,
					})
				}
				className="w-full h-12 rounded-lg bg-sablier-gray px-3 py-2
                               border border-transparent focus:outline-none
                               focus:border-sablier-orange"
			/>
		</div>
	);
}
