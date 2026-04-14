"use client";

import { useState } from 'react';
import { Upload, X, File, Loader, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import styles from './DocumentUpload.module.css';

interface DocumentUploadProps {
    briefId: string;
    folderId?: string | null;
    onUploadComplete: (newDocs?: any[]) => void;
}

interface UploadingFile {
    id: string;
    name: string;
    status: 'uploading' | 'completed' | 'error';
    error?: string;
}

export default function DocumentUpload({ briefId, folderId, onUploadComplete }: DocumentUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [uploadQueue, setUploadQueue] = useState<UploadingFile[]>([]);

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

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await uploadFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await uploadFiles(Array.from(e.target.files));
        }
    };

    const uploadFiles = async (files: File[]) => {
        setIsUploading(true);
        const newQueueItems: UploadingFile[] = files.map(f => ({
            id: `${Date.now()}-${f.name}`,
            name: f.name,
            status: 'uploading'
        }));
        
        setUploadQueue(prev => [...prev, ...newQueueItems]);

        try {
            const { upload } = await import('@vercel/blob/client');
            const { createDocument } = await import('@/app/actions/documents');

            const uploadPromises = files.map(async (file, index) => {
                const queueId = newQueueItems[index].id;
                
                try {
                    const uniqueFilename = `${Date.now()}-${file.name}`;
                    const newBlob = await upload(uniqueFilename, file, {
                        access: 'public',
                        handleUploadUrl: '/api/upload/handle',
                    });

                    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
                    const docType = file.type.includes('image') ? 'image' :
                                    file.type.includes('pdf') ? 'pdf' :
                                    ['doc', 'docx'].includes(ext) ? 'docx' : 'pdf';

                    const result = await createDocument({
                        name: file.name,
                        url: newBlob.url,
                        type: docType,
                        size: file.size,
                        briefId: briefId,
                        folderId: folderId || null,
                    });

                    if (result.success) {
                        setUploadQueue(prev => prev.map(item => 
                            item.id === queueId ? { ...item, status: 'completed' as const } : item
                        ));
                        return result.document;
                    } else {
                        throw new Error(result.error || "Database sync failed");
                    }
                } catch (err: any) {
                    setUploadQueue(prev => prev.map(item => 
                        item.id === queueId ? { ...item, status: 'error' as const, error: err.message } : item
                    ));
                    return null;
                }
            });

            const results = await Promise.all(uploadPromises);
            const successfulDocs = results.filter(doc => !!doc);

            if (successfulDocs.length > 0) {
                onUploadComplete(successfulDocs);
            }
        } catch (error) {
            console.error('Batch upload error:', error);
        } finally {
            // Keep the queue visible for a moment so users see the success/error
            setTimeout(() => {
                setIsUploading(false);
                setUploadQueue([]);
            }, 3000);
        }
    };

    return (
        <div className={styles.container}>
            <div className="flex items-center justify-between mb-4">
                <h3 className={styles.title}>Document Vault</h3>
                {isUploading && <Loader className="animate-spin text-primary" size={16} />}
            </div>

            <div
                className={`${styles.dropzone} ${dragActive ? styles.active : ''} ${isUploading ? styles.uploading : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {uploadQueue.length > 0 ? (
                    <div className="w-full flex flex-col gap-3 p-4">
                        {uploadQueue.map(file => (
                            <div key={file.id} className="flex items-center justify-between bg-white/50 p-2 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText size={16} className="text-slate-400 shrink-0" />
                                    <span className="text-xs font-medium truncate max-w-[200px]">{file.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {file.status === 'uploading' && <Loader className="animate-spin text-blue-500" size={14} />}
                                    {file.status === 'completed' && <CheckCircle className="text-emerald-500" size={14} />}
                                    {file.status === 'error' && <AlertCircle className="text-red-500" size={14} />}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <Upload size={40} className={styles.icon} />
                        <p className={styles.text}>Drag files to securely ingest</p>
                        <label className={styles.button}>
                            <input
                                type="file"
                                multiple
                                onChange={handleFileInput}
                                className={styles.fileInput}
                                accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.png,.jpg,.jpeg"
                            />
                            Select From System
                        </label>
                        <p className={styles.hint}>Encrypted Upload: PDF, Word, Image, PPT</p>
                    </>
                )}
            </div>
        </div>
    );
}
