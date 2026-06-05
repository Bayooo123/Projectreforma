"use client";

import { useState } from 'react';
import { X, Download, ChevronLeft, ChevronRight, History, Layers } from 'lucide-react';
import { logDocumentDownload, getDocumentVersions } from '@/app/actions/documents';
import { useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import styles from './DocumentPreview.module.css';

// Configure PDF.js worker
// Use local worker for maximum stability and to bypass CDN/CORS issues
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface DocumentPreviewProps {
    document: {
        id: string;
        name: string;
        url: string;
        type: string;
    } | null;
    onClose: () => void;
    onNavigate?: (direction: 'prev' | 'next') => void;
    canNavigate?: { prev: boolean; next: boolean };
    onVersionSelect?: (document: any) => void;
}

interface VersionItem {
    id: string;
    name: string;
    version: number;
    uploadedAt: Date;
    url: string;
}

export default function DocumentPreview({ document, onClose, onNavigate, canNavigate }: DocumentPreviewProps) {
    const [numPages, setNumPages] = useState<number>(0);
    // const [pageNumber, setPageNumber] = useState<number>(1); // Removed for continuous scroll
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [versions, setVersions] = useState<VersionItem[]>([]);
    const [showVersions, setShowVersions] = useState(false);

    useEffect(() => {
        if (document) {
            setLoading(true);
            getDocumentVersions(document.id).then(v => {
                setVersions(v as any);
            });
        }
    }, [document?.id]);

    if (!document) return null;

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setLoading(false);
        setError(null);
    };

    const getFileExtension = (filename: string) => {
        return filename.split('.').pop()?.toLowerCase() || '';
    };

    const renderPreview = () => {
        const extension = getFileExtension(document.name);

        // PDF Preview
        if (extension === 'pdf') {
            return (
                <div className={styles.pdfContainer}>
                    <Document
                        file={document.url}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={(err) => {
                            console.error('PDF Load Error:', err);
                            setLoading(false);
                            setError(err);
                        }}
                        loading={<div className={styles.loading}>Loading PDF...</div>}
                        error={
                            <div className={styles.error}>
                                <p>Failed to load PDF.</p>
                                <p className="text-xs mt-2 opacity-75">{error?.message || 'Unknown error'}</p>
                                <a href={document.url} download className="mt-4 underline">Download Original</a>
                            </div>
                        }
                        className={styles.pdfDocument}
                    >
                        {Array.from(new Array(numPages), (el, index) => (
                            <Page
                                key={`page_${index + 1}`}
                                pageNumber={index + 1}
                                renderTextLayer={true}
                                renderAnnotationLayer={true}
                                className={styles.pdfPage}
                                scale={1.2} // Slightly larger default scale
                                loading={
                                    <div className="h-[800px] w-[600px] bg-white animate-pulse mb-8 rounded shadow" />
                                }
                            />
                        ))}
                    </Document>
                </div>
            );
        }

        // Image Preview
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
            return (
                <div className={styles.imageContainer}>
                    <img
                        src={document.url}
                        alt={document.name}
                        className={styles.image}
                        onLoad={() => setLoading(false)}
                    />
                </div>
            );
        }

        // DOCX Preview (using Google Docs Viewer)
        if (['doc', 'docx'].includes(extension)) {
            return (
                <div className={styles.docxContainer}>
                    <iframe
                        src={`https://docs.google.com/gview?url=${encodeURIComponent(document.url)}&embedded=true`}
                        className={styles.iframe}
                        onLoad={() => setLoading(false)}
                    />
                </div>
            );
        }

        // Fallback for unsupported types
        return (
            <div className={styles.unsupported}>
                <p>Preview not available for this file type</p>
                <a href={document.url} download className={styles.downloadLink}>
                    Download to view
                </a>
            </div>
        );
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <h3 className={styles.title}>{document.name}</h3>
                    </div>
                    <div className={styles.actions}>
                        <a
                            href={document.url}
                            download
                            className={styles.downloadButton}
                            title="Download"
                            onClick={() => logDocumentDownload(document.id).catch(() => {})}
                        >
                            <Download size={20} />
                        </a>
                        {versions.length > 1 && (
                            <button 
                                onClick={() => setShowVersions(!showVersions)} 
                                className={`${styles.actionButton} ${showVersions ? styles.active : ''}`}
                                title="Version History"
                            >
                                <History size={20} />
                                <span className={styles.versionBadge}>{versions.length}</span>
                            </button>
                        )}
                        <button onClick={onClose} className={styles.closeButton} title="Close">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className={styles.mainContent}>
                    {showVersions && (
                        <div className={styles.versionSidebar}>
                            <div className={styles.sidebarHeader}>
                                <Layers size={16} />
                                <span>Version History</span>
                            </div>
                            <div className={styles.versionList}>
                                {versions.map((v) => (
                                    <div 
                                        key={v.id} 
                                        className={`${styles.versionItem} ${v.id === document.id ? styles.currentVersion : ''}`}
                                        onClick={() => v.id !== document.id && onVersionSelect?.(v)}
                                    >
                                        <div className={styles.versionNumber}>v{v.version}</div>
                                        <div className={styles.versionInfo}>
                                            <div className={styles.versionDate}>
                                                {new Date(v.uploadedAt).toLocaleDateString()}
                                            </div>
                                            {v.id === document.id && <span className={styles.currentLabel}>Current</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className={styles.viewerPane}>
                        {loading && <div className={styles.loading}>Loading...</div>}
                        {renderPreview()}
                    </div>
                </div>

                {onNavigate && canNavigate && (
                    <div className={styles.navigation}>
                        <button
                            onClick={() => onNavigate('prev')}
                            disabled={!canNavigate.prev}
                            className={styles.navButton}
                            title="Previous document"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            onClick={() => onNavigate('next')}
                            disabled={!canNavigate.next}
                            className={styles.navButton}
                            title="Next document"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
