"use client";

import { useState, useEffect } from 'react';
import { X, Loader, FolderInput, Folder, File as FileIcon } from 'lucide-react';
import { moveDocument, getFolders } from '@/app/actions/folders';
import styles from './CreateFolderModal.module.css';

interface MoveDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    briefId: string;
    documentId: string;
    documentName: string;
    currentFolderId: string | null;
    onSuccess: () => void;
}

export default function MoveDocumentModal({ isOpen, onClose, briefId, documentId, documentName, currentFolderId, onSuccess }: MoveDocumentModalProps) {
    const [folders, setFolders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedFolderId(currentFolderId);
            fetchFolders();
        }
    }, [isOpen, briefId, currentFolderId]);

    const fetchFolders = async () => {
        setIsLoading(true);
        try {
            const result = await getFolders(briefId);
            setFolders(result);
        } catch (err) {
            console.error('Error fetching folders:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFolderId === currentFolderId) {
            onClose(); // No change
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            const result = await moveDocument(documentId, selectedFolderId, briefId);
            if (result.success) {
                onSuccess();
            } else {
                setError(result.error || 'Failed to move document');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        <FolderInput size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
                        Move Document
                    </h2>
                    <button className={styles.closeBtn} onClick={onClose} type="button">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.content}>
                        {error && <div className={styles.errorText}>{error}</div>}

                        <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Moving <strong style={{color: 'var(--text-primary)'}}>{documentName}</strong>
                        </p>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Select Destination</label>
                            
                            {isLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', color: 'var(--text-secondary)' }}>
                                    <Loader size={16} className="animate-spin" /> Loading folders...
                                </div>
                            ) : (
                                <div style={{ 
                                    maxHeight: '200px', 
                                    overflowY: 'auto', 
                                    border: '1px solid var(--border)', 
                                    borderRadius: 'var(--radius-md)',
                                    marginTop: '0.5rem'
                                }}>
                                    <div 
                                        onClick={() => setSelectedFolderId(null)}
                                        style={{ 
                                            padding: '0.75rem 1rem', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '0.75rem',
                                            cursor: 'pointer',
                                            backgroundColor: selectedFolderId === null ? 'var(--primary-light)' : 'transparent',
                                            borderBottom: '1px solid var(--border)',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.95rem'
                                        }}
                                    >
                                        <FileIcon size={18} color={selectedFolderId === null ? 'var(--primary)' : 'var(--text-secondary)'} />
                                        <span style={{ fontWeight: selectedFolderId === null ? 600 : 400 }}>Main Brief (Root)</span>
                                        {currentFolderId === null && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>(Current)</span>}
                                    </div>
                                    
                                    {folders.map(folder => (
                                        <div 
                                            key={folder.id}
                                            onClick={() => setSelectedFolderId(folder.id)}
                                            style={{ 
                                                padding: '0.75rem 1rem', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '0.75rem',
                                                cursor: 'pointer',
                                                backgroundColor: selectedFolderId === folder.id ? 'var(--primary-light)' : 'transparent',
                                                borderBottom: '1px solid var(--border)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.95rem'
                                            }}
                                        >
                                            <Folder size={18} color={selectedFolderId === folder.id ? 'var(--primary)' : '#6b7280'} />
                                            <span style={{ fontWeight: selectedFolderId === folder.id ? 600 : 400 }}>{folder.name}</span>
                                            {currentFolderId === folder.id && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>(Current)</span>}
                                        </div>
                                    ))}
                                    
                                    {folders.length === 0 && (
                                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            No folders created yet.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.footer}>
                        <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={isSubmitting || isLoading || selectedFolderId === currentFolderId}
                        >
                            {isSubmitting && <Loader size={16} className="animate-spin" />}
                            {selectedFolderId === currentFolderId ? 'Current Location' : 'Move Here'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
