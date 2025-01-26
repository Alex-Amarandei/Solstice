import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';

import { Sablier } from '@project/anchor';
import { STREAM_NAME, TIMEOUT } from '../constants';
import { beforeAllSetup, createStream } from './setup';

describe('Lockup Linear Stream - Create Test', () => {
	let program: Program<Sablier>;

	let alice: Keypair;
	let bob: Keypair;

	let tokenMint: PublicKey;

	beforeAll(async () => {
		({ alice, bob, tokenMint, program } = await beforeAllSetup());
	}, TIMEOUT);

	describe('Lockup Linear Stream - Create - Happy Flow', () => {
		it(
			'should create a lockup linear stream',
			async () => {
				// Create a lockup linear stream
				const startTime = Math.floor(Date.now() / 1000) + 60;
				const options = {
					streamName: STREAM_NAME,
					startTime: Math.floor(Date.now() / 1000) + 60,
					endTime: startTime + 3600,
					cliffTime: startTime + 1800,
					amount: 1_000,
					isCancelable: true,
					isTransferable: true,
				};

				const [lockupLinearStream] = await createStream(alice, bob, tokenMint, program, options);

				// Verify that all fields in the stream are properly populated
				const streamData = await program.account.lockupLinearStream.fetch(lockupLinearStream);

				expect(streamData.baseStream.id).toBe('LL-0');

				expect(streamData.baseStream.sender.toBase58()).toBe(alice.publicKey.toBase58());
				expect(streamData.baseStream.recipient.toBase58()).toBe(bob.publicKey.toBase58());

				expect(streamData.baseStream.tokenMint.toBase58()).toBe(tokenMint.toBase58());

				expect(streamData.baseStream.amounts.deposited.toNumber()).toBe(options.amount);
				expect(streamData.baseStream.amounts.refunded.toNumber()).toBe(0);
				expect(streamData.baseStream.amounts.withdrawn.toNumber()).toBe(0);

				expect(streamData.baseStream.startTime.toNumber()).toBe(options.startTime);
				expect(streamData.cliffTime.toNumber()).toBe(options.cliffTime);
				expect(streamData.baseStream.endTime.toNumber()).toBe(options.endTime);

				expect(streamData.baseStream.isCancelable).toBe(options.isCancelable);
				expect(streamData.baseStream.isCanceled).toBe(false); // Streams are not canceled by default
				expect(streamData.baseStream.isTransferable).toBe(options.isTransferable);
			},
			TIMEOUT
		);
	});

	describe('Lockup Linear Stream - Create - Error Flow', () => {
		it(
			'should fail if start time is in the past',
			async () => {
				await expect(
					createStream(alice, bob, tokenMint, program, {
						startTime: 0, // Start time in the past
					})
				).rejects.toThrow(/Start time must not be in the past/);
			},
			TIMEOUT
		);

		it(
			'should fail if start time is after cliff time',
			async () => {
				const now = Math.floor(Date.now() / 1000);

				await expect(
					createStream(alice, bob, tokenMint, program, {
						startTime: now + 100,
						cliffTime: now + 50, // Cliff time before start time
						endTime: now + 200,
					})
				).rejects.toThrow(/Cliff time must be between start and end time/);
			},
			TIMEOUT
		);

		it(
			'should fail if start time is after end time',
			async () => {
				const now = Math.floor(Date.now() / 1000);

				await expect(
					createStream(alice, bob, tokenMint, program, {
						startTime: now + 100,
						cliffTime: now + 200,
						endTime: now, // End time before start time
					})
				).rejects.toThrow(/End time must be after start time/);
			},
			TIMEOUT
		);

		it(
			'should fail if amount is zero',
			async () => {
				await expect(
					createStream(alice, bob, tokenMint, program, {
						amount: 0, // Amount is zero
					})
				).rejects.toThrow(/Amount must be greater than 0/);
			},
			TIMEOUT
		);
	});
});
