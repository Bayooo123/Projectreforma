"use client";

import { useState } from 'react';
import { FileText, Image, FileCheck, Upload, Download, Eye, Loader } from 'lucide-react';
import styles from './DocumentList.module.css';

interface Document {
    id: string;
    name: string;
    type: 'pdf' | 'docx' | 'image' | 'scan';
    size: number;
    uploadedAt: Date;
    ocrStatus?: 'pending' | 'processing' | 'completed' | 'failed';
    ocrText?: string;
}

interface DocumentListProps {
    briefId: string;
    onDocumentClick: (document: Document) => void;
}

const MOCK_DOCUMENTS: Document[] = [
    {
        id: '1',
        name: 'Motion for Bail.pdf',
        type: 'pdf',
        size: 2400000,
        uploadedAt: new Date('2025-10-15'),
        ocrStatus: 'completed',
    },
    {
        id: '2',
        name: 'Affidavit of Facts.pdf',
        type: 'scan',
        size: 1800000,
        uploadedAt: new Date('2025-10-14'),
        ocrStatus: 'processing',
    },
    {
        id: '3',
        name: 'Evidence Photo 1.jpg',
        type: 'image',
        size: 450000,
        uploadedAt: new Date('2025-10-13'),
        ocrStatus: 'completed',
    },
    {
        id: '4',
        name: 'Court Order.pdf',
        type: 'pdf',
        size: 980000,
        uploadedAt: new Date('2025-10-12'),
    },
    {
        id: '5',
        name: 'Written Address.docx',
        type: 'docx',
        size: 320000,
        uploadedAt: new Date('2025-10-11'),
    },
];

const DocumentList = ({ briefId, onDocumentClick }: DocumentListProps) => {
    const [documents] = useState<Document[]>(MOCK_DOCUMENTS);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const getFileIcon = (type: string) => {
        switch (type) {
            case 'image':
                return <Image size={20} />;
            case 'scan':
                return <FileCheck size={20} />;
            default:
                return <FileText size={20} />;
        }
    };

    const getOCRStatusBadge = (status?: string) => {
        if (!status) return null;

        const badges = {
            pending: { text: 'OCR Pending', className: styles.ocrPending },
            processing: { text: 'Processing OCR...', className: styles.ocrProcessing },
            completed: { text: 'OCR Complete', className: styles.ocrCompleted },
            failed: { text: 'OCR Failed', className: styles.ocrFailed },
        };

        const badge = badges[status as keyof typeof badges];
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
        // TODO: Implement actual upload with OCR processing
        // For now, just simulate upload
        for (let i = 0; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            setUploadProgress(i);
        }
        setIsUploading(false);
        setUploadProgress(0);
    };

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
                {documents.map((doc) => (
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
                                <span>{doc.uploadedAt.toLocaleDateString()}</span>
                                {getOCRStatusBadge(doc.ocrStatus)}
                            </div>
                        </div>
                        <div className={styles.documentActions}>
                            <button className={styles.actionBtn} title="Preview">
                                <Eye size={16} />
                            </button>
                            <button className={styles.actionBtn} title="Download">
                                <Download size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DocumentList;
