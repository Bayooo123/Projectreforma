import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getCurrentUserWithWorkspace } from '@/lib/workspace';
import BriefsPageClient from './BriefsPageClient';
import { Suspense } from 'react';
import BriefsTable from '@/components/briefs/BriefsTable';
import BriefTableSkeleton from '@/components/briefs/BriefTableSkeleton';

export default async function BriefsPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    // Get workspace
    const data = await getCurrentUserWithWorkspace();

    if (!data?.workspace) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>No Workspace Found</h2>
                <p>Please create a workspace first.</p>
            </div>
        );
    }

    return (
        <BriefsPageClient workspaceId={data.workspace.id}>
            <Suspense fallback={<BriefTableSkeleton />}>
                <BriefsTable workspaceId={data.workspace.id} />
            </Suspense>
        </BriefsPageClient>
    );
}
