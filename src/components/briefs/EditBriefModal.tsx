"use client";

import { X, Loader } from 'lucide-react';
import { useState, useEffect } from 'react';
import styles from './BriefUploadModal.module.css'; // Reuse existing styles
import { updateBrief } from '@/app/actions/briefs';
import { getClientsForWorkspace, getLawyersForWorkspace } from '@/lib/briefs';

interface EditBriefModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (updatedBrief: any) => void;
    brief: any; // Using any for simplicity as per existing patterns, but strongly typed would be better
    workspaceId: string;
}

interface Client {
    id: string;
    name: string;
    email: string | null;
    company: string | null;
}

interface Lawyer {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
}

const EditBriefModal = ({ isOpen, onClose, onSuccess, brief, workspaceId }: EditBriefModalProps) => {
    // Form state
    const [briefName, setBriefName] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedLawyerId, setSelectedLawyerId] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('active');
    const [description, setDescription] = useState('');

    // Data state
    const [clients, setClients] = useState<Client[]>([]);
    const [lawyers, setLawyers] = useState<Lawyer[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load data when modal opens
    useEffect(() => {
        if (isOpen && workspaceId) {
            loadData();
            // Pre-fill form
            if (brief) {
                setBriefName(brief.name || '');
                setSelectedClientId(brief.client?.id || '');
                setSelectedLawyerId(brief.lawyer?.id || '');
                setCategory(brief.category || '');
                setStatus(brief.status || 'active');
                setDescription(brief.description || '');
            }
        }
    }, [isOpen, workspaceId, brief]);

    const loadData = async () => {
        setIsLoadingData(true);
        try {
            const [clientsData, lawyersData] = await Promise.all([
                getClientsForWorkspace(workspaceId),
                getLawyersForWorkspace(workspaceId),
            ]);

            setClients(clientsData);
            setLawyers(lawyersData);
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Failed to load clients and lawyers');
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Client is now optional
        // if (!selectedClientId) {
        //     alert('Please select a client');
        //     return;
        // }

        if (!selectedLawyerId) {
            alert('Please select a lawyer');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await updateBrief(brief.id, {
                name: briefName,
                clientId: selectedClientId,
                lawyerId: selectedLawyerId,
                category,
                status,
                description: description || undefined,
            });

            if (result.success) {
                console.log('[EditBriefModal] Brief updated successfully!', result.brief);

                // Show success message
                alert('Brief updated successfully!');
                onSuccess(result.brief);
                onClose();
            } else {
                alert('Failed to update brief: ' + result.error);
            }
        } catch (error) {
            console.error('Error updating brief:', error);
            alert('An error occurred while updating the brief');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Edit Brief</h2>
                    <button onClick={onClose} className={styles.closeBtn} disabled={isSubmitting}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    {isLoadingData ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader className="animate-spin text-gray-500" size={32} />
                        </div>
                    ) : (
                        <form className={styles.form} onSubmit={handleSubmit}>
                            <div className={styles.row}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Brief Number</label>
                                    <input
                                        type="text"
                                        className={`${styles.input} bg-gray-100 cursor-not-allowed`}
                                        value={brief.briefNumber}
                                        disabled
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Brief Name *</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={briefName}
                                        onChange={e => setBriefName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Client (Optional)</label>
                                <select
                                    className={styles.select}
                                    value={selectedClientId}
                                    onChange={e => setSelectedClientId(e.target.value)}
                                >
                                    <option value="">Select Client...</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.id}>
                                            {client.name} {client.company ? `(${client.company})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Lawyer in Charge *</label>
                                <select
                                    className={styles.select}
                                    value={selectedLawyerId}
                                    onChange={e => setSelectedLawyerId(e.target.value)}
                                    required
                                >
                                    <option value="">Select Lawyer...</option>
                                    {lawyers.map(lawyer => (
                                        <option key={lawyer.id} value={lawyer.id}>
                                            {lawyer.name || lawyer.email} ({lawyer.role})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.row}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Category *</label>
                                    <select
                                        className={styles.select}
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                        required
                                    >
                                        <option value="">Select Category...</option>
                                        <option>Litigation</option>
                                        <option>ADR</option>
                                        <option>Tax advisory</option>
                                        <option>Corporate advisory</option>
                                        <option>Academic research</option>
                                        <option>Real estate</option>
                                        <option>Wills and intestate matters</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Status</label>
                                    <select
                                        className={styles.select}
                                        value={status}
                                        onChange={e => setStatus(e.target.value)}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="finalized">Finalized</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Description (Optional)</label>
                                <textarea
                                    className={styles.textarea}
                                    placeholder="Brief description..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <div className={styles.footer}>
                                <button type="button" onClick={onClose} className={styles.cancelBtn} disabled={isSubmitting}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.submitBtn} disabled={isSubmitting || lawyers.length === 0}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader size={16} className="animate-spin mr-2" />
                                            Updating...
                                        </>
                                    ) : (
                                        'Update Brief'
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditBriefModal;
