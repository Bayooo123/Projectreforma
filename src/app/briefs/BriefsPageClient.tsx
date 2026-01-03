"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BriefUploadModal from '@/components/briefs/BriefUploadModal';
import { Suspense } from 'react';
import BriefsTable from '@/components/briefs/BriefsTable';
import BriefTableSkeleton from '@/components/briefs/BriefTableSkeleton';
import styles from './page.module.css';

interface BriefsPageClientProps {
    workspaceId: string;
}

export default function BriefsPageClient({ workspaceId }: BriefsPageClientProps) {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const router = useRouter();

    const handleBriefCreated = async (newBrief?: any) => {
        setIsUploadModalOpen(false);
        router.refresh(); // Sync server state
    };

    return (
        <div className={styles.page}>
            <Suspense fallback={<BriefTableSkeleton />}>
                <BriefsTable workspaceId={workspaceId} />
            </Suspense>

            <BriefUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onSuccess={handleBriefCreated}
                workspaceId={workspaceId}
            />
        </div>
    );
}
