import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
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

    // Anomaly detection already runs daily for every workspace via the
    // /api/cron/anomaly-scan cron (vercel.json). Re-running the same
    // multi-query scan on every single Pulse visit was pure duplicated
    // load — it competed for the same connection-constrained database pool
    // as this page's own data fetch, right when load time matters most.

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
