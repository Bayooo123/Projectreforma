"use client";

import { useState, useEffect } from 'react';
import { X, Loader, FolderInput, Briefcase } from 'lucide-react';
import { reassignBriefHierarchy, getBriefs } from '@/app/actions/briefs';
import styles from './CreateFolderModal.module.css';

interface MoveBriefModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    briefId: string;
    briefName: string;
    currentParentId: string | null;
    onSuccess: () => void;
}

export default function MoveBriefModal({ 
    isOpen, 
    onClose, 
    workspaceId, 
    briefId, 
    briefName, 
    currentParentId, 
    onSuccess 
}: MoveBriefModalProps) {
    const [briefs, setBriefs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedParentId(currentParentId);
            fetchBriefs();
        }
    }, [isOpen, currentParentId, workspaceId]);

    const fetchBriefs = async () => {
        setIsLoading(true);
        try {
            const result = await getBriefs(workspaceId);
            // Filter out the brief itself to prevent self-parenting
            setBriefs(result.filter((b: any) => b.id !== briefId));
        } catch (err) {
            console.error('Error fetching briefs:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedParentId === currentParentId) {
            onClose();
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            const result = await reassignBriefHierarchy(briefId, selectedParentId);
            if (result.success) {
                onSuccess();
            } else {
                setError(result.error || 'Failed to reassign hierarchy');
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
                        Move Brief Hierarchy
                    </h2>
                    <button className={styles.closeBtn} onClick={onClose} type="button">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.content}>
                        {error && <div className={styles.errorText}>{error}</div>}

                        <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Moving <strong style={{color: 'var(--text-primary)'}}>{briefName}</strong>
                        </p>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Select Parent Brief</label>
                            
                            {isLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', color: 'var(--text-secondary)' }}>
                                    <Loader size={16} className="animate-spin" /> Loading briefs...
                                </div>
                            ) : (
                                <div style={{ 
                                    maxHeight: '300px', 
                                    overflowY: 'auto', 
                                    border: '1px solid var(--border)', 
                                    borderRadius: 'var(--radius-md)',
                                    marginTop: '0.5rem'
                                }}>
                                    <div 
                                        onClick={() => setSelectedParentId(null)}
                                        style={{ 
                                            padding: '0.75rem 1rem', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '0.75rem',
                                            cursor: 'pointer',
                                            backgroundColor: selectedParentId === null ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                                            borderBottom: '1px solid var(--border)',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.95rem'
                                        }}
                                    >
                                        <Briefcase size={18} color={selectedParentId === null ? 'var(--primary)' : 'var(--text-secondary)'} />
                                        <span style={{ fontWeight: selectedParentId === null ? 600 : 400 }}>No Parent (Top-level)</span>
                                        {currentParentId === null && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>(Current)</span>}
                                    </div>
                                    
                                    {briefs.map(brief => (
                                        <div 
                                            key={brief.id}
                                            onClick={() => setSelectedParentId(brief.id)}
                                            style={{ 
                                                padding: '0.75rem 1rem', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '0.75rem',
                                                cursor: 'pointer',
                                                backgroundColor: selectedParentId === brief.id ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                                                borderBottom: '1px solid var(--border)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.95rem'
                                            }}
                                        >
                                            <Briefcase size={18} color={selectedParentId === brief.id ? 'var(--primary)' : '#6b7280'} />
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: selectedParentId === brief.id ? 600 : 400 }}>{brief.name}</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{brief.briefNumber}</span>
                                            </div>
                                            {currentParentId === brief.id && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>(Current)</span>}
                                        </div>
                                    ))}
                                    
                                    {briefs.length === 0 && (
                                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            No other briefs to select.
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
                            disabled={isSubmitting || isLoading || selectedParentId === currentParentId}
                        >
                            {isSubmitting && <Loader size={16} className="animate-spin" />}
                            {selectedParentId === currentParentId ? 'Current Hierarchy' : 'Confirm Move'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
