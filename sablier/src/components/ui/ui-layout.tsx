'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, Suspense, useEffect, useRef } from 'react';

import { toast } from 'sonner';
import { AccountChecker } from '../account/account-ui';
import { ClusterChecker, ClusterUiSelect } from '../cluster/cluster-ui';
import { WalletButton } from '../solana/solana-provider';

export function UiLayout({ children, links }: { children: ReactNode; links: { label: string; path: string }[] }) {
	const pathname = usePathname();

	return (
		<div className="h-full flex flex-col">
			{/* Navbar */}
			<div className="navbar bg-sablier-black text-neutral-content flex items-center justify-between px-4 py-2 border-sablier-gray border-b-2">
				{/* Left Section: Navigation Links */}
				<div className="flex flex-[2] justify-center items-center">
					<ul className="flex space-x-4">
						{links.map(({ label, path }) => (
							<li
								key={path}
								className={`${
									(path === '/' && pathname === '/') || (path !== '/' && pathname.startsWith(path))
										? 'active bg-gray-950 text-white'
										: 'text-sablier-gray-text'
								} px-2 py-1 rounded hover:text-white transition hover:bg-none`}
							>
								<Link href={path}>{label}</Link>
							</li>
						))}
					</ul>
				</div>

				{/* Center Section: Logo */}
				<div className="flex flex-[1] justify-center items-center">
					<div className="relative w-full h-12">
						<Image src="/logo.svg" alt="Sablier Logo" layout="fill" objectFit="contain" />
					</div>
				</div>

				{/* Right Section: Dropdown and Wallet */}
				<div className="flex flex-[2] justify-center items-center space-x-4">
					{/* Dropdown */}
					<ClusterUiSelect />
					{/* Wallet Button */}
					<WalletButton />
				</div>
			</div>

			{/* Content Area */}
			<ClusterChecker>
				<AccountChecker />
			</ClusterChecker>
			<div className="flex-grow mx-56">
				<Suspense
					fallback={
						<div className="text-center my-32">
							<span className="loading loading-spinner loading-lg"></span>
						</div>
					}
				>
					{children}
				</Suspense>
			</div>
		</div>
	);
}

export function AppModal({
	children,
	title,
	hide,
	show,
	submit,
	submitDisabled,
	submitLabel,
}: {
	children: ReactNode;
	title: string;
	hide: () => void;
	show: boolean;
	submit?: () => void;
	submitDisabled?: boolean;
	submitLabel?: string;
}) {
	const dialogRef = useRef<HTMLDialogElement | null>(null);

	useEffect(() => {
		if (!dialogRef.current) return;
		if (show) {
			dialogRef.current.showModal();
		} else {
			dialogRef.current.close();
		}
	}, [show, dialogRef]);

	return (
		<dialog className="modal" ref={dialogRef}>
			<div className="modal-box space-y-5">
				<h3 className="font-bold text-lg">{title}</h3>
				{children}
				<div className="modal-action">
					<div className="join space-x-2">
						{submit ? (
							<button className="btn btn-xs lg:btn-md btn-primary" onClick={submit} disabled={submitDisabled}>
								{submitLabel || 'Save'}
							</button>
						) : null}
						<button onClick={hide} className="btn">
							Close
						</button>
					</div>
				</div>
			</div>
		</dialog>
	);
}

export function AppHero({ children, title, subtitle }: { children?: ReactNode; title: ReactNode; subtitle: ReactNode }) {
	return (
		<div className="py-[64px]">
			<div className="text-center justify-items-center">
				<div className="max-w-2xl">
					{typeof title === 'string' ? <h1 className="text-5xl font-bold text-white">{title}</h1> : title}
					{typeof subtitle === 'string' ? <p className="text-2xl py-6 text-white font-medium">{subtitle}</p> : subtitle}
					{children}
				</div>
			</div>
		</div>
	);
}

export function ellipsify(str = '', len = 4) {
	if (str.length > 30) {
		return str.substring(0, len) + '..' + str.substring(str.length - len, str.length);
	}
	return str;
}

export function useTransactionToast() {
	return (signature: string) => {
		toast.success(
			<div className={'text-center'}>
				<div className="text-lg">Transaction sent</div>
				<a
					href={`https://explorer.solana.com/tx/${signature}`}
					target="_blank"
					rel="noopener noreferrer"
					className="btn btn-xs btn-primary"
				>
					View Transaction
				</a>
			</div>
		);
	};
}
