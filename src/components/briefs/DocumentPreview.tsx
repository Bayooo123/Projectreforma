"use client";

import { useState } from 'react';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import styles from './DocumentPreview.module.css';

// Configure PDF.js worker
// Pinning version to match package.json pdfjs-dist (3.11.174) to avoid "Setting up fake worker" warning or failures
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

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
}

export default function DocumentPreview({ document, onClose, onNavigate, canNavigate }: DocumentPreviewProps) {
    const [numPages, setNumPages] = useState<number>(0);
    // const [pageNumber, setPageNumber] = useState<number>(1); // Removed for continuous scroll
    const [loading, setLoading] = useState(true);

    if (!document) return null;

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setLoading(false);
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
                        onLoadError={(error) => {
                            console.error('PDF Load Error:', error);
                            setLoading(false);
                            // Set a visible error state variable if needed, or just rely on the fallback
                        }}
                        loading={<div className={styles.loading}>Loading PDF...</div>}
                        error={(error: { message?: string }) => (
                            <div className={styles.error}>
                                <p>Failed to load PDF.</p>
                                <p className="text-xs mt-2 opacity-75">{error?.message || 'Unknown error'}</p>
                                <a href={document.url} download className="mt-4 underline">Download Original</a>
                            </div>
                        )}
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
                        >
                            <Download size={20} />
                        </a>
                        <button onClick={onClose} className={styles.closeButton} title="Close">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className={styles.content}>
                    {loading && <div className={styles.loading}>Loading...</div>}
                    {renderPreview()}
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
