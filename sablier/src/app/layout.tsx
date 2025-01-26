import { ClusterProvider } from '@/components/cluster/cluster-data-access';
import { SolanaProvider } from '@/components/solana/solana-provider';
import { UiLayout } from '@/components/ui/ui-layout';
import './globals.css';
import { ReactQueryProvider } from './react-query-provider';

export const metadata = {
	title: 'Sablier',
	description: 'Sablier on Solana',
};

const links: { label: string; path: string }[] = [
	{ label: 'Home', path: '/' },
	{ label: 'Vesting', path: '/vesting' },
	{ label: 'Payments', path: '/payments' },
	{ label: 'Airdrops', path: '/airdrops' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>
				<ReactQueryProvider>
					<ClusterProvider>
						<SolanaProvider>
							<UiLayout links={links}>{children}</UiLayout>
						</SolanaProvider>
					</ClusterProvider>
				</ReactQueryProvider>
			</body>
		</html>
	);
}
