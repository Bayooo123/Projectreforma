"use client";

import { useState } from 'react';
import { X, Loader, FolderPlus } from 'lucide-react';
import { createFolder } from '@/app/actions/folders';
import styles from './CreateFolderModal.module.css';

interface CreateFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    briefId: string;
    parentId?: string | null;
    onSuccess: () => void;
}

export default function CreateFolderModal({ isOpen, onClose, briefId, parentId, onSuccess }: CreateFolderModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const result = await createFolder({
                name: name.trim(),
                description: description.trim() || undefined,
                briefId,
                parentId: parentId || undefined
            });

            if (result.success) {
                setName('');
                setDescription('');
                onSuccess();
            } else {
                setError(result.error || 'Failed to create folder');
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
                        <FolderPlus size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
                        Create Folder
                    </h2>
                    <button className={styles.closeBtn} onClick={onClose} type="button">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.content}>
                        {error && <div className={styles.errorText}>{error}</div>}

                        <div className={styles.formGroup}>
                            <label htmlFor="folderName" className={styles.label}>Folder Name *</label>
                            <input
                                id="folderName"
                                type="text"
                                className={styles.input}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Client Evidence"
                                required
                                disabled={isSubmitting}
                                autoFocus
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="folderDesc" className={styles.label}>Description (Optional)</label>
                            <textarea
                                id="folderDesc"
                                className={styles.textarea}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description of folder contents"
                                disabled={isSubmitting}
                            />
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
                            disabled={isSubmitting || !name.trim()}
                        >
                            {isSubmitting && <Loader size={16} className="animate-spin" />}
                            Create Folder
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
