import React, { Suspense } from 'react';
import DraftingStudio from '@/components/drafting/DraftingStudio';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Drafting Studio | Reforma',
    description: 'Intelligent legal drafting and review',
};

export default function DraftingPage() {
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading Studio with Context...</div>}>
                <DraftingStudio />
            </Suspense>
        </div>
    );
}
