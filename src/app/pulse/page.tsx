import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { runAnomalyScan } from '@/lib/anomaly/detector';
import PulseContent from './PulseContent';
import PulseSkeleton from './PulseSkeleton';

export default async function PulsePage({ searchParams }: { searchParams: Promise<{ agent?: string }> }) {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const { agent } = await searchParams;

    const workspaceId = session.user.workspaceId;
    if (!workspaceId) {
        return (
            <div className="p-10 text-center text-slate-500">
                No Workspace Associated with Account
            </div>
        );
    }

    // Fire anomaly scan in background — don't block page load.
    runAnomalyScan(workspaceId).catch(e => console.error('[Pulse] anomaly scan failed:', e));

    return (
        <Suspense fallback={<PulseSkeleton />}>
            <PulseContent
                workspaceId={workspaceId}
                userId={session.user.id}
                userName={session.user.name || ''}
                agent={agent}
            />
        </Suspense>
    );
}
