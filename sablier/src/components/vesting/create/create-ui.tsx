import { Breadcrumb } from '@/components/ui/ui-common';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useLockupLinearProgram } from '../vesting-data-access';

export default function CreateLockupLinearStreamCard() {
	const [id, setId] = useState('');
	const [name, setName] = useState('');
	const [sender, setSender] = useState('');
	const [recipient, setRecipient] = useState('');
	const [tokenMint, setTokenMint] = useState('');
	const [deposited, setDeposited] = useState<string>('');
	const [startTime, setStartTime] = useState<string>('');
	const [endTime, setEndTime] = useState<string>('');
	const [isCancelable, setIsCancelable] = useState<boolean>(false);
	const [isTransferable, setIsTransferable] = useState<boolean>(false);
	const [cliffTime, setCliffTime] = useState<string>('');

	// States for Duration
	const [isDurationMode, setIsDurationMode] = useState(false);
	const [durationDays, setDurationDays] = useState('');
	const [durationHours, setDurationHours] = useState('');
	const [durationMinutes, setDurationMinutes] = useState('');

	const [cliffDays, setCliffDays] = useState('');
	const [cliffHours, setCliffHours] = useState('');
	const [cliffMinutes, setCliffMinutes] = useState('');

	const toggleMode = () => {
		setIsDurationMode(!isDurationMode);

		// Reset fields when switching modes
		setStartTime('');
		setEndTime('');
		setDurationDays('');
		setDurationHours('');
		setDurationMinutes('');
		setCliffTime('');
		setCliffDays('');
		setCliffHours('');
		setCliffMinutes('');
	};

	const { createLockupLinearStream } = useLockupLinearProgram();

	const onCreateStream = async () => {
		try {
			// Convert times to BN
			const startTimeBN = new BN(new Date(startTime).getTime());
			const endTimeBN = new BN(new Date(endTime).getTime());
			// If cliffTime not set, default to startTime
			const cliffTimeBN = cliffTime ? new BN(new Date(cliffTime).getTime()) : startTimeBN;

			const senderPubkey = new PublicKey(sender);
			const recipientPubkey = new PublicKey(recipient);
			const mintPubkey = new PublicKey(tokenMint);

			const lockupStreamData = {
				baseStream: {
					id,
					name,
					sender: senderPubkey,
					recipient: recipientPubkey,
					tokenMint: mintPubkey,
					amounts: {
						deposited: new BN(deposited || '0'),
						refunded: new BN('0'),
						withdrawn: new BN('0'),
					},
					startTime: startTimeBN,
					endTime: endTimeBN,
					isCancelable,
					isCanceled: false,
					isTransferable,
				},
				cliffTime: cliffTimeBN,
			};

			await createLockupLinearStream.mutateAsync(lockupStreamData);

			toast.success('Stream successfully created!');

			// Reset form
			setId('');
			setName('');
			setSender('');
			setRecipient('');
			setTokenMint('');
			setDeposited('');
			setStartTime('');
			setEndTime('');
			setIsCancelable(false);
			setIsTransferable(false);
			setCliffTime('');
		} catch (error) {
			console.error('Error creating stream:', error);
			toast.error('Failed to create stream. Check console for details.');
		}
	};

	return (
		<div className="min-h-screen w-full text-white">
			<Breadcrumb />

			{/* Main Content */}
			<div className="flex flex-col md:flex-row px-8 py-8 gap-6">
				{/* Left Column */}
				<div className="flex-1 flex flex-col space-y-6">
					{/* Page Title */}
					<h1 className="text-2xl font-semibold">Create Lockup Linear Stream</h1>

					{/* GENERAL DETAILS CARD */}
					<div className="bg-sablier-card rounded-lg p-6 shadow-md space-y-6">
						<h2 className="text-lg font-medium mb-2">General Details</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* SHAPE (read-only) */}
							<div className="flex flex-col">
								<label className="text-sm text-sablier-gray-text mb-1">Shape</label>
								<div className="flex items-center space-x-2 bg-sablier-gray text-sablier-gray-text rounded-lg px-3 py-2">
									<span>Lockup Linear with Optional Cliff</span>
								</div>
							</div>

							{/* TOKEN MINT */}
							<div className="flex flex-col">
								<label className="text-sm text-sablier-gray-text mb-1">Token</label>
								<div className="flex items-center space-x-2">
									<input
										type="text"
										placeholder="Choose a token mint..."
										value={tokenMint}
										onChange={(e) => setTokenMint(e.target.value)}
										className="flex-1 rounded-lg bg-sablier-gray px-3 py-2 border border-transparent focus:outline-none focus:border-sablier-orange"
									/>
									<button className="bg-sablier-orange-gradient text-white font-semibold text-sm px-3 py-2 rounded-lg">
										Choose
									</button>
								</div>
							</div>

							{/* Cancelability Toggle */}
							<div className="flex flex-col">
								<label className="text-sm text-sablier-gray-text mb-1">Make the stream cancelable?</label>
								<div className="flex items-center justify-between bg-sablier-gray px-3 py-2 rounded-lg">
									<span>{isCancelable ? 'Cancelable' : 'Not Cancelable'}</span>
									<div className="flex items-center space-x-2">
										<span
											onClick={() => setIsCancelable(true)}
											className={`cursor-pointer px-2 py-1 text-sm rounded-lg ${
												isCancelable
													? 'bg-sablier-orange-gradient text-white font-semibold'
													: 'bg-sablier-shadow text-sablier-gray-text'
											}`}
										>
											On
										</span>
										<span
											onClick={() => setIsCancelable(false)}
											className={`cursor-pointer px-2 py-1 text-sm rounded-lg ${
												!isCancelable
													? 'bg-sablier-orange-gradient text-white font-semibold'
													: 'bg-sablier-shadow text-sablier-gray-text'
											}`}
										>
											Off
										</span>
									</div>
								</div>
							</div>

							{/* Transferability Toggle */}
							<div className="flex flex-col">
								<label className="text-sm text-sablier-gray-text mb-1">Make the stream transferable?</label>
								<div className="flex items-center justify-between bg-sablier-gray px-3 py-2 rounded-lg">
									<span>{isTransferable ? 'Transferable' : 'Not Transferable'}</span>
									<div className="flex items-center space-x-2">
										<span
											onClick={() => setIsTransferable(true)}
											className={`cursor-pointer px-2 py-1 text-sm rounded-lg ${
												isTransferable
													? 'bg-sablier-orange-gradient text-white'
													: 'bg-sablier-shadow text-sablier-gray-text'
											}`}
										>
											On
										</span>
										<span
											onClick={() => setIsTransferable(false)}
											className={`cursor-pointer px-2 py-1 text-sm rounded-lg ${
												!isTransferable
													? 'bg-sablier-orange-gradient text-white'
													: 'bg-sablier-shadow text-sablier-gray-text'
											}`}
										>
											Off
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* STREAM #1 CARD */}
					<div className="bg-sablier-card rounded-lg p-6 shadow-md space-y-6">
						<h2 className="text-lg font-medium">Stream</h2>

						{/* AMOUNT */}
						<div>
							<label className="block text-sm text-sablier-gray-text mb-1">Amount</label>
							<input
								type="number"
								placeholder="Fill in a non-zero amount..."
								value={deposited}
								onChange={(e) => setDeposited(e.target.value)}
								className="w-full rounded-lg bg-sablier-gray px-3 py-2 border border-transparent focus:outline-none focus:border-sablier-orange"
							/>
						</div>

						{/* RECIPIENT */}
						<div>
							<label className="block text-sm text-sablier-gray-text mb-1">Recipient (Public Key)</label>
							<input
								type="text"
								placeholder="Fill in an address..."
								value={recipient}
								onChange={(e) => setRecipient(e.target.value)}
								className="w-full rounded-lg bg-sablier-gray px-3 py-2 border border-transparent focus:outline-none focus:border-sablier-orange"
							/>
						</div>

						{/* Duration */}
						<div className="mb-4">
							<label className="block text-sm text-sablier-gray-text mb-1">Duration</label>

							{/* Container row (fills entire width) */}
							<div className="flex w-full space-x-2">
								{/* Left side: inputs take most space */}
								<div className="flex flex-1 items-center space-x-2">
									{!isDurationMode ? (
										// Fixed Date Mode
										<>
											<input
												type="datetime-local"
												placeholder="Start time"
												value={startTime}
												onChange={(e) => setStartTime(e.target.value)}
												className="h-12 w-full rounded-lg bg-sablier-gray px-3 py-2
                                   border border-transparent focus:outline-none
                                   focus:border-sablier-orange"
											/>
											<input
												type="datetime-local"
												placeholder="End time"
												value={endTime}
												onChange={(e) => setEndTime(e.target.value)}
												className="h-12 w-full rounded-lg bg-sablier-gray px-3 py-2
                                   border border-transparent focus:outline-none
                                   focus:border-sablier-orange"
											/>
										</>
									) : (
										// Duration Mode (Days / Hours / Minutes)
										<>
											<input
												type="number"
												placeholder="Days"
												value={durationDays}
												onChange={(e) => setDurationDays(e.target.value)}
												className="h-12 w-full rounded-lg bg-sablier-gray px-3 py-2
                                   border border-transparent focus:outline-none
                                   focus:border-sablier-orange"
											/>
											<input
												type="number"
												placeholder="Hours"
												value={durationHours}
												onChange={(e) => setDurationHours(e.target.value)}
												className="h-12 w-full rounded-lg bg-sablier-gray px-3 py-2
                                   border border-transparent focus:outline-none
                                   focus:border-sablier-orange"
											/>
											<input
												type="number"
												placeholder="Minutes"
												value={durationMinutes}
												onChange={(e) => setDurationMinutes(e.target.value)}
												className="h-12 w-full rounded-lg bg-sablier-gray px-3 py-2
                                   border border-transparent focus:outline-none
                                   focus:border-sablier-orange"
											/>
										</>
									)}
								</div>

								{/* Right side: toggle button (fixed width, same height) */}
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

						{/* Cliff Section (No extra button) */}
						<div>
							<label className="block text-sm text-sablier-gray-text mb-1">Cliff Duration</label>
							{!isDurationMode ? (
								// Fixed Date for Cliff
								<input
									type="datetime-local"
									placeholder="Choose the cliff date/time..."
									value={cliffTime}
									onChange={(e) => setCliffTime(e.target.value)}
									className="w-full h-12 rounded-lg bg-sablier-gray px-3 py-2
                             border border-transparent focus:outline-none
                             focus:border-sablier-orange"
								/>
							) : (
								// Duration for Cliff (Days/Hours/Minutes)
								<div className="flex space-x-2">
									<input
										type="number"
										placeholder="Days"
										value={cliffDays}
										onChange={(e) => setCliffDays(e.target.value)}
										className="w-full h-12 rounded-lg bg-sablier-gray px-3 py-2
                               border border-transparent focus:outline-none
                               focus:border-sablier-orange"
									/>
									<input
										type="number"
										placeholder="Hours"
										value={cliffHours}
										onChange={(e) => setCliffHours(e.target.value)}
										className="w-full h-12 rounded-lg bg-sablier-gray px-3 py-2
                               border border-transparent focus:outline-none
                               focus:border-sablier-orange"
									/>
									<input
										type="number"
										placeholder="Minutes"
										value={cliffMinutes}
										onChange={(e) => setCliffMinutes(e.target.value)}
										className="w-full h-12 rounded-lg bg-sablier-gray px-3 py-2
                               border border-transparent focus:outline-none
                               focus:border-sablier-orange"
									/>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* RIGHT SIDEBAR (Summary) */}
				<div className="w-full md:w-80 bg-sablier-card rounded-lg p-6 shadow-md h-fit mt-14">
					<h3 className="text-base font-semibold mb-3">Summary</h3>
					<div className="text-sm text-sablier-gray-text space-y-2">
						<div className="flex justify-between">
							<span>Chain</span>
							<span className="text-sablier-gray-text">Solana</span>
						</div>
						<div className="flex justify-between">
							<span>Cancelability</span>
							<span className="text-sablier-gray-text">{isCancelable ? 'Yes, will be cancelable' : 'No'}</span>
						</div>
						<div className="flex justify-between">
							<span>Transferability</span>
							<span className="text-sablier-gray-text">{isTransferable ? 'Yes, will be transferable' : 'No'}</span>
						</div>
						<div className="flex justify-between">
							<span>Token</span>
							<span className="text-sablier-gray-text">{tokenMint ? tokenMint.slice(0, 8) + '...' : '-'}</span>
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
						<span className="text-md font-semibold text-gray-100">{deposited}</span>
					</div>
					<p className="text-xs text-gray-500">Excluding gas</p>

					{/* Create Stream Button (full width) */}
					<button
						onClick={onCreateStream}
						className="w-full mt-4 bg-sablier-orange-gradient
                       text-white font-semibold py-3 px-6 rounded-lg
                       transition-colors"
					>
						Create Stream
					</button>
				</div>
			</div>
		</div>
	);
}
