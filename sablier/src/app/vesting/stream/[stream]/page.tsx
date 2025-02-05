import StreamFeature from '@/components/vesting/stream/stream-feature';

export default async function StreamView({ params }: { params: Promise<{ stream: string }> }) {
	const streamId = (await params).stream;

	return <StreamFeature streamId={streamId} />;
}
