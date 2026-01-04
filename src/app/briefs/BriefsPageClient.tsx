"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BriefUploadModal from '@/components/briefs/BriefUploadModal';
import styles from './page.module.css';

interface BriefsPageClientProps {
    workspaceId: string;
    children: React.ReactNode;
}

export default function BriefsPageClient({ workspaceId, children }: BriefsPageClientProps) {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const router = useRouter();

    const handleBriefCreated = async (newBrief?: any) => {
        setIsUploadModalOpen(false);
        router.refresh(); // Sync server state
    };

    return (
        <div className={styles.page}>
            {children}

            <BriefUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onSuccess={handleBriefCreated}
                workspaceId={workspaceId}
            />
        </div>
    );
}
