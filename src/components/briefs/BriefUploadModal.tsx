"use client";

import { X, UploadCloud, Loader, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import styles from './BriefUploadModal.module.css';
import { createBrief } from '@/app/actions/briefs';
import { getClientsForWorkspace, getLawyersForWorkspace, generateBriefNumber, createClientQuick } from '@/lib/briefs';

interface BriefUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
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

const BriefUploadModal = ({ isOpen, onClose, workspaceId }: BriefUploadModalProps) => {
    // Form state
    const [briefNumber, setBriefNumber] = useState('');
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

    // Quick client creation
    const [showQuickClient, setShowQuickClient] = useState(false);
    const [quickClientName, setQuickClientName] = useState('');
    const [quickClientEmail, setQuickClientEmail] = useState('');

    // Load data when modal opens
    useEffect(() => {
        if (isOpen && workspaceId) {
            loadData();
        }
    }, [isOpen, workspaceId]);

    const loadData = async () => {
        setIsLoadingData(true);
        try {
            const [clientsData, lawyersData, generatedNumber] = await Promise.all([
                getClientsForWorkspace(workspaceId),
                getLawyersForWorkspace(workspaceId),
                generateBriefNumber(workspaceId),
            ]);

            setClients(clientsData);
            setLawyers(lawyersData);
            setBriefNumber(generatedNumber);
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Failed to load clients and lawyers');
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleQuickClientCreate = async () => {
        if (!quickClientName.trim()) {
            alert('Please enter client name');
            return;
        }

        try {
            const result = await createClientQuick(workspaceId, quickClientName, quickClientEmail || undefined);
            if (result.success && result.client) {
                setClients([...clients, result.client]);
                setSelectedClientId(result.client.id);
                setShowQuickClient(false);
                setQuickClientName('');
                setQuickClientEmail('');
            } else {
                alert('Failed to create client');
            }
        } catch (error) {
            console.error('Error creating quick client:', error);
            alert('An error occurred while creating client');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedClientId) {
            alert('Please select a client');
            return;
        }

        if (!selectedLawyerId) {
            alert('Please select a lawyer');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await createBrief({
                briefNumber,
                name: briefName,
                clientId: selectedClientId,
                lawyerId: selectedLawyerId,
                workspaceId,
                category,
                status,
                description: description || undefined,
            });

            if (result.success) {
                // Reset form
                setBriefName('');
                setSelectedClientId('');
                setSelectedLawyerId('');
                setCategory('');
                setStatus('active');
                setDescription('');
                onClose();

                // Show success message
                alert('Brief created successfully!');
            } else {
                alert('Failed to create brief: ' + result.error);
            }
        } catch (error) {
            console.error('Error creating brief:', error);
            alert('An error occurred while creating the brief');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Create New Brief</h2>
                    <button onClick={handleClose} className={styles.closeBtn} disabled={isSubmitting}>
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
                                        value={briefNumber}
                                        onChange={e => setBriefNumber(e.target.value)}
                                        required
                                        disabled
                                    />
                                    <p className={styles.hint}>Auto-generated</p>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Brief Name *</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="e.g. Motion for Bail"
                                        value={briefName}
                                        onChange={e => setBriefName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Client *</label>
                                {!showQuickClient ? (
                                    <div className={styles.selectWrapper}>
                                        <select
                                            className={styles.select}
                                            value={selectedClientId}
                                            onChange={e => setSelectedClientId(e.target.value)}
                                            required
                                        >
                                            <option value="">Select Client...</option>
                                            {clients.map(client => (
                                                <option key={client.id} value={client.id}>
                                                    {client.name} {client.company ? `(${client.company})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            className={styles.quickAddBtn}
                                            onClick={() => setShowQuickClient(true)}
                                        >
                                            <Plus size={14} /> New Client
                                        </button>
                                    </div>
                                ) : (
                                    <div className={styles.quickClientForm}>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            placeholder="Client Name"
                                            value={quickClientName}
                                            onChange={e => setQuickClientName(e.target.value)}
                                        />
                                        <input
                                            type="email"
                                            className={styles.input}
                                            placeholder="Email (optional)"
                                            value={quickClientEmail}
                                            onChange={e => setQuickClientEmail(e.target.value)}
                                        />
                                        <div className={styles.quickClientActions}>
                                            <button type="button" className={styles.quickAddConfirm} onClick={handleQuickClientCreate}>
                                                Create
                                            </button>
                                            <button type="button" className={styles.quickAddCancel} onClick={() => setShowQuickClient(false)}>
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
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
                                {lawyers.length === 0 && (
                                    <p className={styles.hint}>No lawyers found. Invite team members first.</p>
                                )}
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
                                <button type="button" onClick={handleClose} className={styles.cancelBtn} disabled={isSubmitting}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.submitBtn} disabled={isSubmitting || lawyers.length === 0}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader size={16} className="animate-spin mr-2" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Brief'
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

export default BriefUploadModal;
