import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { getBriefById } from '@/app/actions/briefs';
import BriefDetailClient from './BriefDetailClient';

interface BriefDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function BriefDetailPage(props: BriefDetailPageProps) {
    const { id } = await props.params;
    const session = await auth();

    if (!session?.user) redirect('/login');

    const brief = await getBriefById(id);
    if (!brief) notFound();

    return <BriefDetailClient brief={brief} />;
}
