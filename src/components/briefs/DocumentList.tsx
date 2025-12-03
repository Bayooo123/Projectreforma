"use client";

import { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, FileCheck, Upload, Download, Eye, Loader } from 'lucide-react';
import styles from './DocumentList.module.css';
import { getDocuments, createDocument } from '@/app/actions/documents';
import type { PutBlobResult } from '@vercel/blob';

export interface Document {
    id: string;
    name: string;
    type: 'pdf' | 'docx' | 'image' | 'scan';
    size: number;
    uploadedAt: Date;
    ocrStatus?: 'pending' | 'processing' | 'completed' | 'failed';
    ocrText?: string;
    url?: string;
}

interface DocumentListProps {
    briefId: string;
    onDocumentClick: (document: Document) => void;
}

const DocumentList = ({ briefId, onDocumentClick }: DocumentListProps) => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDocuments = async () => {
            if (!briefId) return;
            setIsLoading(true);
            try {
                const data = await getDocuments(briefId);
                // Map Prisma documents to UI documents
                const mappedDocs: Document[] = data.map(doc => ({
                    ...doc,
                    type: doc.type as Document['type'],
                    ocrStatus: doc.ocrStatus as Document['ocrStatus'],
                }));
                setDocuments(mappedDocs);
            } catch (error) {
                console.error("Failed to fetch documents", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDocuments();
    }, [briefId]);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const getFileIcon = (type: string) => {
        if (type.includes('image')) return <ImageIcon size={20} />;
        if (type.includes('scan')) return <FileCheck size={20} />;
        return <FileText size={20} />;
    };

    const getOCRStatusBadge = (status?: string) => {
        if (!status) return null;

        const badges: Record<string, { text: string, className: string }> = {
            pending: { text: 'OCR Pending', className: styles.ocrPending },
            processing: { text: 'Processing OCR...', className: styles.ocrProcessing },
            completed: { text: 'OCR Complete', className: styles.ocrCompleted },
            failed: { text: 'OCR Failed', className: styles.ocrFailed },
        };

        const badge = badges[status];
        if (!badge) return null;

        return (
            <span className={badge.className}>
                {status === 'processing' && <Loader size={12} className={styles.spinner} />}
                {badge.text}
            </span>
        );
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        setUploadProgress(10);

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // 1. Upload to Vercel Blob
                const response = await fetch(
                    `/api/upload?filename=${file.name}`,
                    {
                        method: 'POST',
                        body: file,
                    },
                );

                if (!response.ok) throw new Error('Upload failed');

                const newBlob = (await response.json()) as PutBlobResult;
                setUploadProgress(50);

                // 2. Create Document record in DB
                const result = await createDocument({
                    name: file.name,
                    url: newBlob.url,
                    type: file.type.includes('image') ? 'image' : 'pdf', // Simple type detection
                    size: file.size,
                    briefId: briefId,
                });

                if (result.success && result.document) {
                    const newDoc: Document = {
                        ...result.document!,
                        type: result.document!.type as Document['type'],
                        ocrStatus: result.document!.ocrStatus as Document['ocrStatus'],
                    };
                    setDocuments(prev => [newDoc, ...prev]);
                }
            }
            setUploadProgress(100);
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload file');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    if (isLoading) {
        return <div className="p-4 text-center text-gray-500">Loading documents...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>Documents ({documents.length})</h2>
                    <p className={styles.subtitle}>All documents in this brief</p>
                </div>
                <label className={styles.uploadBtn}>
                    <Upload size={18} />
                    <span>Upload Document</span>
                    <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                        className={styles.fileInput}
                    />
                </label>
            </div>

            {isUploading && (
                <div className={styles.uploadProgress}>
                    <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <span className={styles.progressText}>Uploading... {uploadProgress}%</span>
                </div>
            )}

            <div className={styles.documentList}>
                {documents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No documents yet.</div>
                ) : (
                    documents.map((doc) => (
                        <div
                            key={doc.id}
                            className={styles.documentItem}
                            onClick={() => onDocumentClick(doc)}
                        >
                            <div className={styles.documentIcon}>
                                {getFileIcon(doc.type)}
                            </div>
                            <div className={styles.documentInfo}>
                                <div className={styles.documentName}>{doc.name}</div>
                                <div className={styles.documentMeta}>
                                    <span>{formatFileSize(doc.size)}</span>
                                    <span>•</span>
                                    <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                    {getOCRStatusBadge(doc.ocrStatus)}
                                </div>
                            </div>
                            <div className={styles.documentActions}>
                                <button className={styles.actionBtn} title="Preview">
                                    <Eye size={16} />
                                </button>
                                <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.actionBtn}
                                    title="Download"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Download size={16} />
                                </a>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DocumentList;
