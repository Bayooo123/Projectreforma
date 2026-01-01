"use client";

import { useState } from 'react';
import { Upload, X, File, Loader } from 'lucide-react';
import styles from './DocumentUpload.module.css';

interface DocumentUploadProps {
    briefId: string;
    onUploadComplete: () => void;
}

export default function DocumentUpload({ briefId, onUploadComplete }: DocumentUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await uploadFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            await uploadFiles(Array.from(e.target.files));
        }
    };

    const uploadFiles = async (files: File[]) => {
        setIsUploading(true);

        try {
            // Standardizing approach: Use Server Actions + Client Blob Upload
            // This unifies logic with DocumentList.tsx and bypasses 4.5MB limit.
            const { upload } = await import('@vercel/blob/client');
            const { createDocument } = await import('@/app/actions/documents');

            let successCount = 0;

            for (const file of files) {
                try {
                    // 1. Upload to Blob (Client Side)
                    const newBlob = await upload(file.name, file, {
                        access: 'public',
                        handleUploadUrl: '/api/upload/handle',
                    });

                    // 2. Create DB Record via Server Action
                    const docType = file.type.includes('image') ? 'image' :
                        file.type.includes('pdf') ? 'pdf' :
                            file.name.endsWith('.docx') ? 'docx' : 'pdf';

                    const result = await createDocument({
                        name: file.name,
                        url: newBlob.url,
                        type: docType,
                        size: file.size,
                        briefId: briefId,
                    });

                    if (result.success) {
                        successCount++;
                    } else {
                        console.error('DB Create failed:', result.error);
                        throw new Error(result.error || 'Failed to record document');
                    }

                } catch (innerError) {
                    console.error(`Failed to process ${file.name}:`, innerError);
                    alert(`Failed to upload ${file.name}: ${(innerError as Error).message}`);
                }
            }

            if (successCount > 0) {
                // Trigger refresh
                onUploadComplete();
            }

        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload files. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className={styles.container}>
            <h3 className={styles.title}>Upload Documents</h3>

            <div
                className={`${styles.dropzone} ${dragActive ? styles.active : ''} ${isUploading ? styles.uploading : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {isUploading ? (
                    <div className={styles.uploadingState}>
                        <Loader className={styles.spinner} size={32} />
                        <p>Uploading...</p>
                    </div>
                ) : (
                    <>
                        <Upload size={48} className={styles.icon} />
                        <p className={styles.text}>Drag and drop files here</p>
                        <p className={styles.subtext}>or</p>
                        <label className={styles.button}>
                            <input
                                type="file"
                                multiple
                                onChange={handleFileInput}
                                className={styles.fileInput}
                                accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
                            />
                            Browse Files
                        </label>
                        <p className={styles.hint}>Supported: PDF, DOC, DOCX, PPT, PPTX, TXT</p>
                    </>
                )}
            </div>
        </div>
    );
}
