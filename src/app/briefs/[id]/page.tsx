import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getBriefById } from '@/app/actions/briefs';
import BriefDetailClient from './BriefDetailClient';

interface BriefDetailPageProps {
    params: {
        id: string;
    };
}

export default async function BriefDetailPage({ params }: BriefDetailPageProps) {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    // Fetch brief data
    const brief = await getBriefById(params.id);

    if (!brief) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>Brief Not Found</h2>
                <p>The brief you're looking for doesn't exist or you don't have access to it.</p>
                <a href="/briefs" style={{ color: '#667eea', textDecoration: 'underline' }}>
                    Back to Briefs
                </a>
            </div>
        );
    }

    return <BriefDetailClient brief={brief} />;
}
