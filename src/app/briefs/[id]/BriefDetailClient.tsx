"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Tag, User, Building, Calendar, Upload, Loader, FileText, Trash2, Edit, Hammer } from 'lucide-react';
import DocumentUpload from '@/components/briefs/DocumentUpload';
import DocumentPreview from '@/components/briefs/DocumentPreview';
import BriefActivityFeed from '@/components/briefs/BriefActivityFeed';
import EditBriefModal from '@/components/briefs/EditBriefModal';
import styles from './page.module.css';

interface Brief {
    id: string;
    briefNumber: string;
    name: string;
    category: string;
    status: string;
    description: string | null;
    dueDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    client: {
        id: string;
        name: string;
        email: string | null;
        company: string | null;
    };
    lawyer: {
        id: string;
        name: string | null;
        email: string | null;
    };
    documents: Array<{
        id: string;
        name: string;
        url: string;
        type: string;
        size: number;
        uploadedAt: Date;
    }>;
    workspace: {
        id: string;
        name: string;
    };
    inboundEmailId: string;
}

interface BriefDetailClientProps {
    brief: Brief;
}

export default function BriefDetailClient({ brief }: BriefDetailClientProps) {
    const router = useRouter();
    const [documents, setDocuments] = useState(brief.documents);
    const [previewDocument, setPreviewDocument] = useState<typeof documents[0] | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const refreshDocuments = async () => {
        // Refresh documents from server
        try {
            const response = await fetch(`/api/briefs/${brief.id}/documents`);
            if (response.ok) {
                const docs = await response.json();
                setDocuments(docs);
            }
        } catch (error) {
            console.error('Error refreshing documents:', error);
        }
    };

    const handleNavigateDocument = (direction: 'prev' | 'next') => {
        if (!previewDocument) return;
        const currentIndex = documents.findIndex(d => d.id === previewDocument.id);
        if (direction === 'prev' && currentIndex > 0) {
            setPreviewDocument(documents[currentIndex - 1]);
        } else if (direction === 'next' && currentIndex < documents.length - 1) {
            setPreviewDocument(documents[currentIndex + 1]);
        }
    };

    const getNavigationState = () => {
        if (!previewDocument) return { prev: false, next: false };
        const currentIndex = documents.findIndex(d => d.id === previewDocument.id);
        return {
            prev: currentIndex > 0,
            next: currentIndex < documents.length - 1
        };
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.topRow}>
                    <Link href="/briefs" className={styles.backLink}>
                        <ArrowLeft size={18} />
                        <span>Back to Briefs</span>
                    </Link>
                    <div className={styles.actions}>
                        <Link href={`/drafting?briefId=${brief.id}`} className={styles.draftBtn}>
                            <Hammer size={16} />
                            Start Drafting
                        </Link>
                        <button className={styles.editBtn} onClick={() => setIsEditModalOpen(true)}>
                            <Edit size={16} />
                            Edit Brief
                        </button>
                    </div>
                </div>

                <div className={styles.titleRow}>
                    <h1 className={styles.title}>{brief.name}</h1>
                    <span className={`${styles.statusBadge} ${styles[brief.status.toLowerCase()]}`}>
                        {brief.status}
                    </span>
                </div>

                <div className={styles.metaRow}>
                    <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Brief Number:</span>
                        <span className={styles.metaValue}>{brief.briefNumber}</span>
                    </div>
                    <div className={styles.metaItem}>
                        <Tag size={14} className={styles.metaIcon} />
                        <span className={styles.metaValue}>{brief.category}</span>
                    </div>
                    <div className={styles.metaItem}>
                        <Clock size={14} className={styles.metaIcon} />
                        <span className={styles.metaValue}>
                            Updated {formatDate(brief.updatedAt)}
                        </span>
                    </div>
                </div>

                <div className={styles.compactInfoRow}>
                    <div className={styles.compactInfoItem}>
                        <Building size={14} className={styles.compactIcon} />
                        <span className={styles.compactLabel}>Client:</span>
                        <span className={styles.compactValue}>{brief.client.name}</span>
                    </div>
                    <div className={styles.compactInfoItem}>
                        <User size={14} className={styles.compactIcon} />
                        <span className={styles.compactLabel}>Lawyer:</span>
                        <span className={styles.compactValue}>{brief.lawyer.name || brief.lawyer.email}</span>
                    </div>
                    {brief.dueDate && (
                        <div className={styles.compactInfoItem}>
                            <Calendar size={14} className={styles.compactIcon} />
                            <span className={styles.compactLabel}>Due:</span>
                            <span className={styles.compactValue}>{formatDate(brief.dueDate)}</span>
                        </div>
                    )}
                </div>

                {brief.description && (
                    <div className={styles.descriptionBox}>
                        <h3 className={styles.descriptionTitle}>Description</h3>
                        <p className={styles.descriptionText}>{brief.description}</p>
                    </div>
                )}
            </div>

            <div className={styles.content}>
                <DocumentUpload briefId={brief.id} onUploadComplete={refreshDocuments} />

                <div className={styles.documentsHeader}>
                    <h2 className={styles.documentsTitle}>
                        Documents ({documents.length})
                    </h2>
                </div>

                {documents.length === 0 ? (
                    <div className={styles.emptyState}>
                        <FileText size={48} className={styles.emptyIcon} />
                        <h3 className={styles.emptyTitle}>No Documents Yet</h3>
                        <p className={styles.emptyText}>
                            Upload documents related to this brief to keep everything organized.
                        </p>
                    </div>
                ) : (
                    <div className={styles.documentsList}>
                        {documents.map((doc) => (
                            <div key={doc.id} className={styles.documentCard}>
                                <div className={styles.documentIcon}>
                                    <FileText size={24} />
                                </div>
                                <div className={styles.documentInfo}>
                                    <h4 className={styles.documentName}>{doc.name}</h4>
                                    <div className={styles.documentMeta}>
                                        <span>{formatFileSize(doc.size)}</span>
                                        <span>•</span>
                                        <span>Uploaded {formatDate(doc.uploadedAt)}</span>
                                    </div>
                                </div>
                                <div className={styles.documentActions}>
                                    <button
                                        onClick={() => setPreviewDocument(doc)}
                                        className={styles.viewBtn}
                                    >
                                        View
                                    </button>
                                    <button className={styles.deleteBtn}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}


                <BriefActivityFeed briefId={brief.id} inboundEmailId={brief.inboundEmailId} />
            </div>

            <EditBriefModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={() => {
                    setIsEditModalOpen(false);
                    router.refresh();
                }}
                brief={brief}
                workspaceId={brief.workspace.id}
            />

            <DocumentPreview
                document={previewDocument}
                onClose={() => setPreviewDocument(null)}
                onNavigate={handleNavigateDocument}
                canNavigate={getNavigationState()}
            />
        </div>
    );
}
