"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Tag, User, Building, Calendar, Upload, Loader, FileText, Trash2, Edit } from 'lucide-react';
import DocumentUpload from '@/components/briefs/DocumentUpload';
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
}

interface BriefDetailClientProps {
    brief: Brief;
}

export default function BriefDetailClient({ brief }: BriefDetailClientProps) {
    const [documents, setDocuments] = useState(brief.documents);

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
                        <button className={styles.editBtn}>
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

                <div className={styles.infoGrid}>
                    <div className={styles.infoCard}>
                        <div className={styles.infoHeader}>
                            <Building size={16} />
                            <span>Client</span>
                        </div>
                        <div className={styles.infoContent}>
                            <p className={styles.infoTitle}>{brief.client.name}</p>
                            {brief.client.company && (
                                <p className={styles.infoSubtitle}>{brief.client.company}</p>
                            )}
                            {brief.client.email && (
                                <p className={styles.infoEmail}>{brief.client.email}</p>
                            )}
                        </div>
                    </div>

                    <div className={styles.infoCard}>
                        <div className={styles.infoHeader}>
                            <User size={16} />
                            <span>Lawyer in Charge</span>
                        </div>
                        <div className={styles.infoContent}>
                            <p className={styles.infoTitle}>{brief.lawyer.name || brief.lawyer.email}</p>
                            {brief.lawyer.email && brief.lawyer.name && (
                                <p className={styles.infoEmail}>{brief.lawyer.email}</p>
                            )}
                        </div>
                    </div>

                    {brief.dueDate && (
                        <div className={styles.infoCard}>
                            <div className={styles.infoHeader}>
                                <Calendar size={16} />
                                <span>Due Date</span>
                            </div>
                            <div className={styles.infoContent}>
                                <p className={styles.infoTitle}>{formatDate(brief.dueDate)}</p>
                            </div>
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
                                    <a
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.viewBtn}
                                    >
                                        View
                                    </a>
                                    <button className={styles.deleteBtn}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
