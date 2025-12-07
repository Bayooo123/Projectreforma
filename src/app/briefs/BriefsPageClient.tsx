"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import BriefList, { BriefListRef } from '@/components/briefs/BriefList';
import BriefUploadModal from '@/components/briefs/BriefUploadModal';
import styles from './page.module.css';

interface BriefsPageClientProps {
    workspaceId: string;
}

export default function BriefsPageClient({ workspaceId }: BriefsPageClientProps) {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const briefListRef = useRef<BriefListRef>(null);
    const router = useRouter();

    const handleBriefCreated = async (newBrief?: any) => {
        console.log('[BriefsPageClient] handleBriefCreated called with brief:', newBrief);
        setIsUploadModalOpen(false);

        // Optimistic update: Add the brief to the list immediately
        if (newBrief && briefListRef.current) {
            console.log('[BriefsPageClient] Adding brief optimistically');
            briefListRef.current.addBriefOptimistically(newBrief);
        }

        // Force Next.js to invalidate all caches for next navigation
        console.log('[BriefsPageClient] Calling router.refresh()');
        router.refresh();

        // DO NOT sync with server - rely on optimistic update
        // The brief is already in the database, it will show on next page load
        console.log('[BriefsPageClient] Brief added optimistically, will sync on next page navigation');
    };

    return (
        <div className={styles.page}>
            <BriefList
                ref={briefListRef}
                onUpload={() => setIsUploadModalOpen(true)}
                workspaceId={workspaceId}
            />

            <BriefUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onSuccess={handleBriefCreated}
                workspaceId={workspaceId}
            />
        </div>
    );
}
