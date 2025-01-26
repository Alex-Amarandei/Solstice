'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function NotFound() {
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const [escaped, setEscaped] = useState(false);

	const handleHover = () => {
		if (!escaped) {
			setPosition({
				x: Math.random() * 800 - 400,
				y: Math.random() * 400 - 200,
			});
		}
	};

	return (
		<div className="flex flex-col items-center justify-center h-screen bg-sablier-black text-white text-center px-6 relative overflow-hidden">
			<h1 className="text-6xl font-bold mb-4">404 - Nothing to be seen here 🤷‍♂️</h1>
			<p className="text-lg mb-6">
				Sorry, this page doesn’t exist (yet). Something awesome is coming here soon, but until then, enjoy this timeless classic. 🤓
			</p>

			<div className="relative w-full max-w-3xl aspect-video mb-6">
				<Image src="/404.gif" alt="404 gif" layout="fill" objectFit="contain" priority />
			</div>
			<Link
				href="/"
				className={`btn font-semibold text-white px-6 py-3 rounded transition ${
					escaped ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-sablier-orange hover:bg-orange-600'
				}`}
				style={{
					transform: `translate(${position.x}px, ${position.y}px)`,
					transition: 'transform 0.3s ease',
				}}
				onMouseEnter={handleHover}
				onClick={() => setEscaped(true)}
			>
				{escaped ? 'You got me! 😅' : '...take me home, ser'}
			</Link>
		</div>
	);
}
