'use client';

import { useEffect, useState } from 'react';
import { X, FileText, FileImage, File, Download, ExternalLink, Loader2, Upload } from 'lucide-react';
import { getDocuments } from '@/app/actions/documents';
import styles from './BriefDocsQuickView.module.css';

interface Doc {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: Date;
}

interface Props {
    briefId: string;
    briefName: string;
    onClose: () => void;
    onUpload: () => void;
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocIcon({ type }: { type: string }) {
    const t = type.toLowerCase();
    if (t.includes('image') || t.includes('png') || t.includes('jpg') || t.includes('jpeg')) {
        return <FileImage size={20} className={styles.iconImage} />;
    }
    if (t.includes('pdf')) return <FileText size={20} className={styles.iconPdf} />;
    return <File size={20} className={styles.iconDefault} />;
}

function timeAgo(date: Date): string {
    const d = new Date(date);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BriefDocsQuickView({ briefId, briefName, onClose, onUpload }: Props) {
    const [docs, setDocs] = useState<Doc[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDocuments(briefId).then(data => {
            setDocs(data as Doc[]);
            setLoading(false);
        });
    }, [briefId]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <>
            {/* Backdrop */}
            <div className={styles.backdrop} onClick={onClose} />

            {/* Panel */}
            <div className={styles.panel}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <FileText size={16} className={styles.headerIcon} />
                        <div>
                            <div className={styles.headerTitle}>Documents</div>
                            <div className={styles.headerSub}>{briefName}</div>
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                <div className={styles.body}>
                    {loading ? (
                        <div className={styles.loading}>
                            <Loader2 size={20} className={styles.spinner} />
                            <span>Loading documents…</span>
                        </div>
                    ) : docs.length === 0 ? (
                        <div className={styles.empty}>
                            <FileText size={36} className={styles.emptyIcon} />
                            <p className={styles.emptyTitle}>No documents yet</p>
                            <p className={styles.emptyText}>Upload the first document for this brief</p>
                            <button className={styles.uploadBtn} onClick={() => { onClose(); onUpload(); }}>
                                <Upload size={14} /> Upload Document
                            </button>
                        </div>
                    ) : (
                        <ul className={styles.docList}>
                            {docs.map(doc => (
                                <li key={doc.id} className={styles.docItem}>
                                    <div className={styles.docIcon}>
                                        <DocIcon type={doc.type} />
                                    </div>
                                    <div className={styles.docInfo}>
                                        <span className={styles.docName}>{doc.name}</span>
                                        <span className={styles.docMeta}>
                                            {formatSize(doc.size)} · {timeAgo(doc.uploadedAt)}
                                        </span>
                                    </div>
                                    <div className={styles.docActions}>
                                        <a
                                            href={doc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.docBtn}
                                            title="Open"
                                        >
                                            <ExternalLink size={14} />
                                        </a>
                                        <a
                                            href={doc.url}
                                            download={doc.name}
                                            className={styles.docBtn}
                                            title="Download"
                                        >
                                            <Download size={14} />
                                        </a>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {docs.length > 0 && (
                    <div className={styles.footer}>
                        <span className={styles.footerCount}>{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
                        <button className={styles.uploadBtn} onClick={() => { onClose(); onUpload(); }}>
                            <Upload size={13} /> Upload More
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
