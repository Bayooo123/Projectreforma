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
            for (const file of files) {
                const response = await fetch(
                    `/api/upload?filename=${encodeURIComponent(file.name)}&briefId=${briefId}`,
                    {
                        method: 'POST',
                        body: file,
                    }
                );

                if (!response.ok) {
                    throw new Error(`Failed to upload ${file.name}`);
                }
            }

            alert(`Successfully uploaded ${files.length} file(s)`);
            onUploadComplete();
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
                                accept=".pdf,.doc,.docx,.txt"
                            />
                            Browse Files
                        </label>
                        <p className={styles.hint}>Supported: PDF, DOC, DOCX, TXT</p>
                    </>
                )}
            </div>
        </div>
    );
}
