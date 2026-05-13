'use client';

import { useEffect, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ExternalLink, Loader2, FileText, Upload } from 'lucide-react';
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

function isImage(type: string, url: string) {
    return /image|png|jpg|jpeg|gif|webp|svg/i.test(type) || /\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i.test(url);
}

function isPdf(type: string, url: string) {
    return /pdf/i.test(type) || /\.pdf(\?|$)/i.test(url);
}

function isOffice(name: string) {
    return /\.(docx?|xlsx?|pptx?)$/i.test(name);
}

export default function BriefDocsQuickView({ briefId, briefName, onClose, onUpload }: Props) {
    const [docs, setDocs] = useState<Doc[]>([]);
    const [index, setIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    // blobUrl: null = not fetched yet, 'loading' = fetching, string = ready, 'error' = failed
    const [blobUrl, setBlobUrl] = useState<string | 'loading' | 'error' | null>(null);
    const blobUrlRef = useRef<string | null>(null);

    useEffect(() => {
        getDocuments(briefId).then(data => {
            setDocs(data as Doc[]);
            setLoading(false);
        });
    }, [briefId]);

    const doc = docs[index] ?? null;

    // Fetch current doc as blob whenever doc changes
    useEffect(() => {
        if (!doc) return;
        if (isOffice(doc.name)) { setBlobUrl(null); return; }

        setBlobUrl('loading');

        // Revoke previous blob
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
        }

        fetch(doc.url)
            .then(r => {
                if (!r.ok) throw new Error('fetch failed');
                return r.blob();
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                blobUrlRef.current = url;
                setBlobUrl(url);
            })
            .catch(() => setBlobUrl('error'));

        return () => {
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current);
                blobUrlRef.current = null;
            }
        };
    }, [doc?.id]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft')  setIndex(i => Math.max(0, i - 1));
            if (e.key === 'ArrowRight') setIndex(i => Math.min(docs.length - 1, i + 1));
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [docs.length, onClose]);

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>

                {/* Top bar */}
                <div className={styles.topBar}>
                    <div className={styles.topLeft}>
                        <FileText size={15} className={styles.topIcon} />
                        <span className={styles.docTitle}>{doc?.name ?? briefName}</span>
                        {docs.length > 1 && (
                            <span className={styles.counter}>{index + 1} / {docs.length}</span>
                        )}
                    </div>
                    <div className={styles.topRight}>
                        {doc && (
                            <>
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className={styles.iconBtn} title="Open in new tab">
                                    <ExternalLink size={15} />
                                </a>
                                <a href={doc.url} download={doc.name} className={styles.iconBtn} title="Download">
                                    <Download size={15} />
                                </a>
                            </>
                        )}
                        <button className={styles.closeBtn} onClick={onClose}>
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Viewer area */}
                <div className={styles.viewerWrap}>
                    {/* Prev arrow */}
                    {docs.length > 1 && (
                        <button
                            className={`${styles.navArrow} ${styles.navLeft}`}
                            onClick={() => setIndex(i => Math.max(0, i - 1))}
                            disabled={index === 0}
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}

                    {/* Document render */}
                    <div className={styles.viewer}>
                        {loading ? (
                            <div className={styles.center}>
                                <Loader2 size={28} className={styles.spinner} />
                                <span>Loading…</span>
                            </div>
                        ) : docs.length === 0 ? (
                            <div className={styles.center}>
                                <FileText size={44} className={styles.emptyIcon} />
                                <p className={styles.emptyTitle}>No documents yet</p>
                                <p className={styles.emptyText}>Upload the first document for this brief</p>
                                <button className={styles.uploadBtn} onClick={() => { onClose(); onUpload(); }}>
                                    <Upload size={14} /> Upload Document
                                </button>
                            </div>
                        ) : doc && isOffice(doc.name) ? (
                            <div className={styles.center}>
                                <FileText size={44} className={styles.emptyIcon} />
                                <p className={styles.emptyTitle}>{doc.name}</p>
                                <p className={styles.emptyText}>Word/Office files cannot preview in the browser.</p>
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className={styles.uploadBtn}>
                                    <ExternalLink size={14} /> Open file
                                </a>
                            </div>
                        ) : blobUrl === 'loading' || blobUrl === null ? (
                            <div className={styles.center}>
                                <Loader2 size={28} className={styles.spinner} />
                                <span>Opening document…</span>
                            </div>
                        ) : blobUrl === 'error' ? (
                            <div className={styles.center}>
                                <FileText size={44} className={styles.emptyIcon} />
                                <p className={styles.emptyTitle}>Could not load document</p>
                                <a href={doc!.url} target="_blank" rel="noopener noreferrer" className={styles.uploadBtn}>
                                    <ExternalLink size={14} /> Open directly
                                </a>
                            </div>
                        ) : doc && isPdf(doc.type, doc.url) ? (
                            <iframe
                                key={doc.id}
                                src={blobUrl}
                                className={styles.iframe}
                                title={doc.name}
                            />
                        ) : doc && isImage(doc.type, doc.url) ? (
                            <img
                                key={doc.id}
                                src={blobUrl}
                                alt={doc.name}
                                className={styles.imageViewer}
                            />
                        ) : doc ? (
                            <div className={styles.center}>
                                <FileText size={44} className={styles.emptyIcon} />
                                <p className={styles.emptyTitle}>{doc.name}</p>
                                <p className={styles.emptyText}>This file type cannot be previewed.</p>
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className={styles.uploadBtn}>
                                    <ExternalLink size={14} /> Open file
                                </a>
                            </div>
                        ) : null}
                    </div>

                    {/* Next arrow */}
                    {docs.length > 1 && (
                        <button
                            className={`${styles.navArrow} ${styles.navRight}`}
                            onClick={() => setIndex(i => Math.min(docs.length - 1, i + 1))}
                            disabled={index === docs.length - 1}
                        >
                            <ChevronRight size={24} />
                        </button>
                    )}
                </div>

                {/* Thumbnail strip — only when multiple docs */}
                {docs.length > 1 && (
                    <div className={styles.strip}>
                        {docs.map((d, i) => (
                            <button
                                key={d.id}
                                className={`${styles.thumb} ${i === index ? styles.thumbActive : ''}`}
                                onClick={() => setIndex(i)}
                                title={d.name}
                            >
                                <FileText size={12} />
                                <span className={styles.thumbName}>{d.name.replace(/\.[^.]+$/, '')}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
