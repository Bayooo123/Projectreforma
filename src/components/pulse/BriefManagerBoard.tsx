'use client';

import { useState } from 'react';
import { ClipboardList, Bot } from 'lucide-react';
import BriefTracker from '@/components/pulse/BriefTracker';
import AgentBoard from '@/components/pulse/AgentBoard';

// Brief Manager has two views: the manual Tracker (a plain, editable record of
// status/next-action per brief — no AI, no tokens) and the AI board (checks
// documents/emails/calendar and writes an executive summary). Tracker is the
// default so the feature works for every firm regardless of AI usage; the AI
// board is one click away, not removed.
export default function BriefManagerBoard({ workspaceId }: { workspaceId: string }) {
    const [tab, setTab] = useState<'tracker' | 'ai'>('tracker');

    return (
        <div>
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.1rem' }}>
                <button
                    onClick={() => setTab('tracker')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '0.45rem 1rem', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer',
                        background: tab === 'tracker' ? '#0d9488' : '#fff',
                        color: tab === 'tracker' ? '#fff' : '#374151',
                        fontSize: '0.78rem', fontWeight: 600,
                    }}
                >
                    <ClipboardList size={13} /> Tracker
                </button>
                <button
                    onClick={() => setTab('ai')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '0.45rem 1rem', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer',
                        background: tab === 'ai' ? '#0d9488' : '#fff',
                        color: tab === 'ai' ? '#fff' : '#374151',
                        fontSize: '0.78rem', fontWeight: 600,
                    }}
                >
                    <Bot size={13} /> AI Insights
                </button>
            </div>

            {tab === 'tracker' ? (
                <BriefTracker workspaceId={workspaceId} />
            ) : (
                <AgentBoard workspaceId={workspaceId} agentType="brief_manager" />
            )}
        </div>
    );
}
