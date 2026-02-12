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
    const [briefName, setBriefName] = useState(''); // Maps to customTitle or name
    const [customBriefNumber, setCustomBriefNumber] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedLawyerInChargeId, setSelectedLawyerInChargeId] = useState('');
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
                // Use customTitle if it exists, otherwise name. For litigation briefs, name is the matter name.
                setBriefName(brief.customTitle || brief.name || '');
                setCustomBriefNumber(brief.customBriefNumber || brief.briefNumber || '');
                setSelectedClientId(brief.client?.id || '');
                // Use lawyerInChargeId if available, fallback to lawyerId (creator) for old records
                setSelectedLawyerInChargeId(brief.lawyerInCharge?.id || brief.lawyerInChargeId || brief.lawyer?.id || '');
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

        if (!selectedLawyerInChargeId) {
            alert('Please select a lawyer in charge');
            return;
        }

        setIsSubmitting(true);

        try {
            // Determine if title changed
            const titleChanged = briefName !== brief.name;
            // If litigation derived, we only set customTitle. If standalone, we can update name (or customTitle, but simplify to name for now? No, use customTitle for overrides).
            // Actually, the backend `updateBrief` handles `customTitle`. 
            // If the brief is standalone, `name` is the main field. If it's litigation, `name` is matter name.
            // Simpler approach: Always send `customTitle` if it differs from the original "source of truth" name, 
            // OR if we treat `briefName` input as `customTitle` override.

            // Let's rely on the action to handle it, but we need to pass the right fields.
            // We'll send `customTitle` if it's different from the underlying matter name (if litigation)
            // For now, let's just send `customTitle` = briefName. 
            // Wait, if it's standalone, we might want to update `name`.
            // The `updateBrief` action signature now takes `customTitle`. 

            const updateData: any = {
                customTitle: briefName, // Always set customTitle for edits
                customBriefNumber: customBriefNumber !== brief.briefNumber ? customBriefNumber : undefined,
                clientId: selectedClientId,
                lawyerInChargeId: selectedLawyerInChargeId,
                category,
                status,
                description: description || undefined,
            };

            // Remove undefined keys
            Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

            const result = await updateBrief(brief.id, updateData);

            if (result.success) {
                console.log('[EditBriefModal] Brief updated successfully!', result.brief);
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
                                        className={styles.input}
                                        value={customBriefNumber}
                                        onChange={e => setCustomBriefNumber(e.target.value)}
                                        placeholder={brief.briefNumber}
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
                                    value={selectedLawyerInChargeId}
                                    onChange={e => setSelectedLawyerInChargeId(e.target.value)}
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

                            {/* Rest of the form remains similar */}
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
                                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
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
