export function Breadcrumb() {
	return (
		<nav className="text-white py-3 px-4 rounded-lg mb-6 text-sm my-5 w-full">
			<ul className="flex items-center space-x-2 text-left">
				<li className="text-gray-400 hover:text-white transition hover:cursor-pointer">Vesting</li>
				<li className="text-gray-500">&gt;</li>
				<li className="font-medium text-white">
					All <span className="text-orange-500">#</span>{' '}
					<span className="text-white">Onchain token vesting. Funds are locked upfront.</span>
				</li>
			</ul>
		</nav>
	);
}
