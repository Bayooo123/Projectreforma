"use client";

import { useState } from 'react';
import { Upload, X, File, Loader } from 'lucide-react';
import styles from './DocumentUpload.module.css';

interface DocumentUploadProps {
    briefId: string;
    folderId?: string | null;
    onUploadComplete: (newDocs?: any[]) => void;
}

export default function DocumentUpload({ briefId, folderId, onUploadComplete }: DocumentUploadProps) {
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
            const { upload } = await import('@vercel/blob/client');
            const { createDocument } = await import('@/app/actions/documents');

            // Parallel uploads
            const uploadPromises = files.map(async (file) => {
                const uniqueFilename = `${Date.now()}-${file.name}`;
                const newBlob = await upload(uniqueFilename, file, {
                    access: 'public',
                    handleUploadUrl: '/api/upload/handle',
                });

                const docType = file.type.includes('image') ? 'image' :
                    file.type.includes('pdf') ? 'pdf' :
                        file.name.endsWith('.docx') ? 'docx' : 'pdf';

                const result = await createDocument({
                    name: file.name,
                    url: newBlob.url,
                    type: docType,
                    size: file.size,
                    briefId: briefId,
                    folderId: folderId || null,
                });

                if (result.success) {
                    return result.document;
                } else {
                    throw new Error(result.error || `Failed to record ${file.name}`);
                }
            });

            const results = await Promise.all(uploadPromises);
            const successfulDocs = results.filter(doc => !!doc);

            if (successfulDocs.length > 0) {
                // Trigger refresh with the new documents
                onUploadComplete(successfulDocs);
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
