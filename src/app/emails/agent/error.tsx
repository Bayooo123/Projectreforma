'use client';

import { useEffect } from 'react';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AgentError({ error, reset }: { error: Error; reset: () => void }) {
    const router = useRouter();
    useEffect(() => { console.error('[EmailAgent]', error); }, [error]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12, padding: '2rem' }}>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Something went wrong in the Link Agent</p>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>{error.message}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => router.back()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <ArrowLeft size={13} /> Go back
                </button>
                <button onClick={reset} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: 'none', background: '#064e3b', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <RefreshCw size={13} /> Retry
                </button>
            </div>
        </div>
    );
}
