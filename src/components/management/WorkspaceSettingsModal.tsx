"use client";

import { useState } from 'react';
import { X, Upload, FileText, Loader, Check } from 'lucide-react';
import { put } from '@vercel/blob';
import styles from './InvoiceModal.module.css'; // Reusing modal styles for consistency

interface WorkspaceSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    currentLetterheadUrl?: string | null;
    onUpdate: () => void;
}

const WorkspaceSettingsModal = ({ isOpen, onClose, workspaceId, currentLetterheadUrl, onUpdate }: WorkspaceSettingsModalProps) => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type (Image or PDF)
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            setUploadError('Please upload an image (JPG, PNG) or PDF file.');
            return;
        }

        setIsUploading(true);
        setUploadError(null);
        setSuccessMessage(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('workspaceId', workspaceId);
            formData.append('type', 'letterhead');

            const response = await fetch('/api/upload/letterhead', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                setSuccessMessage('Letterhead uploaded successfully!');
                onUpdate(); // Trigger refresh in parent
            } else {
                setUploadError(result.error || 'Failed to upload letterhead.');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            setUploadError('An unexpected error occurred during upload.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Workspace Settings</h2>
                        <p className={styles.subtitle}>Manage your office configuration</p>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Letterhead Upload</label>
                        <p className={styles.subtitle} style={{ marginBottom: '1rem' }}>
                            Upload your firm's letterhead (PDF or High-res Image). This will be used as the background for generated PDF invoices.
                        </p>

                        <div style={{
                            border: '2px dashed var(--border)',
                            borderRadius: 'var(--radius-md)',
                            padding: '2rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            backgroundColor: 'var(--surface)'
                        }}>
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={handleFileUpload}
                                style={{
                                    opacity: 0,
                                    position: 'absolute',
                                    width: '100%',
                                    height: '100%',
                                    top: 0,
                                    left: 0,
                                    cursor: 'pointer'
                                }}
                                disabled={isUploading}
                            />
                            {isUploading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                    <Loader size={32} className="spin" />
                                    <span>Uploading...</span>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                    <Upload size={32} color="var(--primary)" />
                                    <span style={{ fontWeight: 600 }}>Click to upload letterhead</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Supports JPG, PNG, PDF</span>
                                </div>
                            )}
                        </div>

                        {uploadError && (
                            <p style={{ color: '#DC2626', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                {uploadError}
                            </p>
                        )}

                        {successMessage && (
                            <p style={{ color: '#16A34A', fontSize: '0.875rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Check size={16} /> {successMessage}
                            </p>
                        )}

                        {currentLetterheadUrl && (
                            <div style={{ marginTop: '1.5rem' }}>
                                <p className={styles.formLabel}>Current Letterhead:</p>
                                <div style={{
                                    marginTop: '0.5rem',
                                    padding: '0.5rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <FileText size={20} color="var(--primary)" />
                                    <a href={currentLetterheadUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem', color: 'var(--primary)', textDecoration: 'underline' }}>
                                        View Uploaded Letterhead
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkspaceSettingsModal;
