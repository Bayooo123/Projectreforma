import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { getBriefById, getBriefTimeline, getBriefSummary } from '@/app/actions/briefs';
import BriefDetailClient from './BriefDetailClient';

interface BriefDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function BriefDetailPage(props: BriefDetailPageProps) {
    const { id } = await props.params;
    const session = await auth();

    if (!session?.user) redirect('/login');

    // Fetch brief metadata, timeline, and cached AI summary in parallel
    const [brief, initialTimeline, initialSummary] = await Promise.all([
        getBriefById(id),
        getBriefTimeline(id),
        getBriefSummary(id),
    ]);

    if (!brief) notFound();

    return <BriefDetailClient brief={brief} initialTimeline={initialTimeline} initialSummary={initialSummary} />;
}
