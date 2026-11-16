import { redirect } from 'next/navigation';
import { getCurrentUserWithWorkspace } from '@/lib/workspace';
import { listRecentBriefs, getLedgerSummary } from '@/app/actions/ai-native';
import AiNativeClient from './AiNativeClient';

export default async function AiNativePage() {
    const data = await getCurrentUserWithWorkspace();
    if (!data?.user) redirect('/login');

    if (!data?.workspace) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>No Workspace Found</h2>
                <p>Please create a workspace first.</p>
            </div>
        );
    }

    const [briefs, ledger] = await Promise.all([listRecentBriefs(), getLedgerSummary()]);

    return <AiNativeClient initialBriefs={briefs} initialLedger={ledger} />;
}
