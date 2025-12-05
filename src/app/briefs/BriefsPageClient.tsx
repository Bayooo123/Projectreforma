"use client";

import { useState, useRef } from 'react';
import BriefList from '@/components/briefs/BriefList';
import BriefUploadModal from '@/components/briefs/BriefUploadModal';
import styles from './page.module.css';

interface BriefsPageClientProps {
    workspaceId: string;
}

export default function BriefsPageClient({ workspaceId }: BriefsPageClientProps) {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const briefListRef = useRef<{ refresh: () => void }>(null);

    const handleBriefCreated = () => {
        console.log('[BriefsPageClient] Brief created, refreshing list');
        setIsUploadModalOpen(false);
        // Call refresh method on BriefList
        if (briefListRef.current) {
            briefListRef.current.refresh();
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
