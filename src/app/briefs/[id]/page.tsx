import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getBriefById } from '@/app/actions/briefs';
import BriefDetailClient from './BriefDetailClient';

export const dynamic = 'force-dynamic';

interface BriefDetailPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function BriefDetailPage(props: BriefDetailPageProps) {
    const params = await props.params;
    const { id } = params;
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    // Retry logic to handle race condition with optimistic updates
    let brief = null;
    const maxRetries = 5;
    const retryDelay = 1000; // ms

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`[BriefDetailPage] Attempt ${attempt}/${maxRetries} to fetch brief ${id}`);
        brief = await getBriefById(id);

        if (brief) {
            console.log(`[BriefDetailPage] ✅ Found brief on attempt ${attempt}`);
            break; // Brief found, exit retry loop
        }

        if (attempt < maxRetries) {
            console.log(`[BriefDetailPage] Brief not found, waiting ${retryDelay}ms...`);
            // Wait before retrying (except on last attempt)
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }

    if (!brief) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>Brief Not Found</h2>
                <p>The brief you're looking for doesn't exist or you don't have access to it.</p>

                <div style={{ marginTop: '2rem' }}>
                    <a href="/briefs" style={{ color: '#667eea', textDecoration: 'underline' }}>
                        Back to Briefs
                    </a>
                </div>
            </div>
        );
    }

    return <BriefDetailClient brief={brief} />;
}
