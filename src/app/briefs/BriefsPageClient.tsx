"use client";

import { useState } from 'react';
import BriefList from '@/components/briefs/BriefList';
import BriefUploadModal from '@/components/briefs/BriefUploadModal';
import styles from './page.module.css';

interface BriefsPageClientProps {
    workspaceId: string;
}

export default function BriefsPageClient({ workspaceId }: BriefsPageClientProps) {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleBriefCreated = () => {
        console.log('[BriefsPageClient] handleBriefCreated called');
        console.log('[BriefsPageClient] Current refreshTrigger:', refreshTrigger);
        setIsUploadModalOpen(false);
        // Trigger refresh by changing the key
        setRefreshTrigger(prev => {
            console.log('[BriefsPageClient] Incrementing refreshTrigger from', prev, 'to', prev + 1);
            return prev + 1;
        });
    };

    return (
        <div className={styles.page}>
            <BriefList
                key={refreshTrigger} // Force re-mount when this changes
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
