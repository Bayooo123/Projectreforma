"use client";

import { useState } from 'react';
import BriefList from '@/components/briefs/BriefList';
import BriefUploadModal from '@/components/briefs/BriefUploadModal';
import styles from './page.module.css';

export default function BriefsPage() {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    return (
        <div className={styles.page}>
            <BriefList onUpload={() => setIsUploadModalOpen(true)} />

            <BriefUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
            />
        </div>
    );
}
