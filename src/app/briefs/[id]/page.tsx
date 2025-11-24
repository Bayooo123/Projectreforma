"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Tag, Search } from 'lucide-react';
import DocumentList from '@/components/briefs/DocumentList';
import DocumentViewer from '@/components/briefs/DocumentViewer';
import styles from './page.module.css';

export default function BriefDetailPage() {
    const [selectedDocument, setSelectedDocument] = useState<any>(null);

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.topRow}>
                    <Link href="/briefs" className={styles.backLink}>
                        <ArrowLeft size={18} />
                        <span>Back to Briefs</span>
                    </Link>
                    <div className={styles.searchWrapper}>
                        <Search size={16} className={styles.searchIcon} />
                        <input type="text" placeholder="Search in documents..." className={styles.searchInput} />
                    </div>
                </div>

                <div className={styles.titleRow}>
                    <h1 className={styles.title}>State v. Johnson</h1>
                    <span className={styles.statusBadge}>Active</span>
                </div>

                <div className={styles.metaRow}>
                    <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Brief Number:</span>
                        <span className={styles.metaValue}>BR-2025-001</span>
                    </div>
                    <div className={styles.metaItem}>
                        <Tag size={14} className={styles.metaIcon} />
                        <span className={styles.metaValue}>Litigation</span>
                    </div>
                    <div className={styles.metaItem}>
                        <Clock size={14} className={styles.metaIcon} />
                        <span className={styles.metaValue}>Last updated 2 hours ago</span>
                    </div>
                </div>

                <div className={styles.descriptionBox}>
                    <h3 className={styles.descriptionTitle}>Description</h3>
                    <p className={styles.descriptionText}>
                        Criminal defense matter. Defendant charged with fraud. Currently preparing motion for bail and gathering evidence for trial.
                    </p>
                </div>
            </div>

            <div className={styles.content}>
                {selectedDocument ? (
                    <div>
                        <button
                            onClick={() => setSelectedDocument(null)}
                            className={styles.backToListBtn}
                        >
                            <ArrowLeft size={16} /> Back to Documents
                        </button>
                        <DocumentViewer document={selectedDocument} />
                    </div>
                ) : (
                    <DocumentList
                        briefId="1"
                        onDocumentClick={setSelectedDocument}
                    />
                )}
            </div>
        </div>
    );
}
