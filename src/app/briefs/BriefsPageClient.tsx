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

    const handleBriefCreated = async () => {
        console.log('[BriefsPageClient] handleBriefCreated called');
        setIsUploadModalOpen(false);

        // Force Next.js to invalidate all caches and re-fetch data
        console.log('[BriefsPageClient] Calling router.refresh()');
        router.refresh();

        // Also directly call refresh on the BriefList component
        if (briefListRef.current) {
            console.log('[BriefsPageClient] Calling refresh on BriefList');
            await briefListRef.current.refresh();
            console.log('[BriefsPageClient] Refresh completed');
        } else {
            console.warn('[BriefsPageClient] briefListRef.current is null');
        }
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
