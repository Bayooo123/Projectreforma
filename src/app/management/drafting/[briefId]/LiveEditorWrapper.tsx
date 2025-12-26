
'use client';

import { useState } from 'react';
import { AgentChat } from '@/components/drafting/AgentChat';
import { LiveEditor } from '@/components/drafting/LiveEditor';

export function LiveEditorWrapper({ briefId }: { briefId: string }) {
    const [draftContent, setDraftContent] = useState('');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">

            {/* Left Column: The Agent (Input & Logic) - 4 Cols */}
            <div className="lg:col-span-4 h-full">
                <AgentChat
                    briefId={briefId}
                    onDraftReceived={(text) => setDraftContent(text)}
                />
            </div>

            {/* Right Column: The Editor (Output & Refinement) - 8 Cols */}
            <div className="lg:col-span-8 h-full">
                <LiveEditor content={draftContent} />
            </div>

        </div>
    );
}
