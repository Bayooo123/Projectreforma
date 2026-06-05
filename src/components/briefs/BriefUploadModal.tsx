"use client";

import { X, UploadCloud, Loader, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import styles from './BriefUploadModal.module.css';
import { createBrief, getBriefs, setBriefLawyerAssignments } from '@/app/actions/briefs';
import { getClientsForWorkspace, getLawyersForWorkspace, generateBriefNumber, createClientQuick } from '@/lib/briefs';

interface BriefUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (brief?: any) => void; // Pass the created brief for optimistic updates
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

const BriefUploadModal = ({ isOpen, onClose, onSuccess, workspaceId }: BriefUploadModalProps) => {
    // Form state
    const [briefNumber, setBriefNumber] = useState('');
    const [briefName, setBriefName] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedLawyerId, setSelectedLawyerId] = useState('');
    const [lawyer2Id, setLawyer2Id] = useState('');
    const [lawyer3Id, setLawyer3Id] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('active');
    const [description, setDescription] = useState('');
    const [selectedParentBriefId, setSelectedParentBriefId] = useState('');

    // Data state
    const [clients, setClients] = useState<Client[]>([]);
    const [lawyers, setLawyers] = useState<Lawyer[]>([]);
    const [briefs, setBriefs] = useState<any[]>([]);
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
            const [clientsData, lawyersData, briefsData] = await Promise.all([
                getClientsForWorkspace(workspaceId),
                getLawyersForWorkspace(workspaceId),
                getBriefs(workspaceId)
            ]);

            setClients(clientsData);
            setLawyers(lawyersData);
            setBriefs(briefsData);
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
            alert('Please select a lead lawyer');
            return;
        }
        if (!lawyer2Id) {
            alert('Please assign at least one assisting lawyer (Lawyer 2 is required)');
            return;
        }
        if (lawyer2Id === selectedLawyerId || lawyer3Id === selectedLawyerId || (lawyer3Id && lawyer3Id === lawyer2Id)) {
            alert('Each lawyer slot must be a different person');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await createBrief({
                briefNumber,
                name: briefName,
                clientId: selectedClientId,
                lawyerId: selectedLawyerId,
                lawyerInChargeId: selectedLawyerId,
                workspaceId,
                category,
                status,
                description: description || undefined,
                parentBriefId: selectedParentBriefId || undefined,
            });

            if (result.success && result.brief) {
                // Save assisting lawyers via BriefLawyer table
                const assistingLawyers = [
                    { lawyerId: lawyer2Id, role: 'assisting' },
                    ...(lawyer3Id ? [{ lawyerId: lawyer3Id, role: 'assisting' }] : []),
                ];
                await setBriefLawyerAssignments(result.brief.id, assistingLawyers);

                setBriefName('');
                setSelectedClientId('');
                setSelectedLawyerId('');
                setLawyer2Id('');
                setLawyer3Id('');
                setCategory('');
                setStatus('active');
                setDescription('');
                setSelectedParentBriefId('');

                alert('Brief created successfully!');
                onSuccess(result.brief);
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

                {isLoadingData ? (
                    <div className="flex justify-center items-center py-12 flex-1">
                        <Loader className="animate-spin text-gray-500" size={32} />
                    </div>
                ) : (
                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.content}>
                            {/* Row 1: Brief Number + Brief Name */}
                            <div className={styles.row}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Brief Number *</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="e.g. BR-2024-001"
                                        value={briefNumber}
                                        onChange={e => setBriefNumber(e.target.value)}
                                        required
                                    />
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

                            {/* Row 2: Client */}
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
                                            <Plus size={14} /> New
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

                            {/* Lawyer 1 — Lead (required) */}
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Lead Lawyer *</label>
                                <select
                                    className={styles.select}
                                    value={selectedLawyerId}
                                    onChange={e => setSelectedLawyerId(e.target.value)}
                                    required
                                >
                                    <option value="">Select Lead Lawyer...</option>
                                    {lawyers.map(l => (
                                        <option key={l.id} value={l.id}>
                                            {l.name || l.email} ({l.role})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Lawyer 2 — Assisting (required) */}
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Assisting Lawyer *</label>
                                <select
                                    className={styles.select}
                                    value={lawyer2Id}
                                    onChange={e => setLawyer2Id(e.target.value)}
                                    required
                                >
                                    <option value="">Select Assisting Lawyer...</option>
                                    {lawyers
                                        .filter(l => l.id !== selectedLawyerId)
                                        .map(l => (
                                            <option key={l.id} value={l.id}>
                                                {l.name || l.email} ({l.role})
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* Lawyer 3 — Optional */}
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Additional Lawyer (Optional)</label>
                                <select
                                    className={styles.select}
                                    value={lawyer3Id}
                                    onChange={e => setLawyer3Id(e.target.value)}
                                >
                                    <option value="">None</option>
                                    {lawyers
                                        .filter(l => l.id !== selectedLawyerId && l.id !== lawyer2Id)
                                        .map(l => (
                                            <option key={l.id} value={l.id}>
                                                {l.name || l.email} ({l.role})
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* Row 4: Category + Status */}
                            <div className={styles.row}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Category *</label>
                                    <select
                                        className={styles.select}
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                        required
                                    >
                                        <option value="">Select...</option>
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
                                        <option value="closed">Closed</option>
                                    </select>
                                </div>
                            </div>

                            {/* Row 5: Parent Brief Selection */}
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Parent Brief (Optional)</label>
                                <select
                                    className={styles.select}
                                    value={selectedParentBriefId}
                                    onChange={e => setSelectedParentBriefId(e.target.value)}
                                >
                                    <option value="">No Parent (Standalone)</option>
                                    {briefs.map(brief => (
                                        <option key={brief.id} value={brief.id}>
                                            {brief.name} ({brief.briefNumber})
                                        </option>
                                    ))}
                                </select>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    Group this brief under another existing brief.
                                </p>
                            </div>
                        </div>

                        <div className={styles.footer}>
                            <button type="button" onClick={handleClose} className={styles.cancelBtn} disabled={isSubmitting}>
                                Cancel
                            </button>
                            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
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
    );
};

export default BriefUploadModal;
