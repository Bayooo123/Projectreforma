"use client";

import { useState, useEffect } from 'react';
import { X, Gavel, Loader } from 'lucide-react';
import { createMatter } from '@/app/actions/matters';
import { generateCaseNumber } from '@/lib/matters';
import { getClientsForWorkspace, getLawyersForWorkspace } from '@/lib/briefs';
import styles from './AddMatterModal.module.css';

interface AddMatterModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    userId: string;
    onSuccess?: () => void;
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

const AddMatterModal = ({ isOpen, onClose, workspaceId, userId, onSuccess }: AddMatterModalProps) => {
    const [caseNumber, setCaseNumber] = useState('');
    const [matterName, setMatterName] = useState('');
    const [clientId, setClientId] = useState('');
    const [lawyerId, setLawyerId] = useState('');
    const [court, setCourt] = useState('');
    const [judge, setJudge] = useState('');
    const [nextCourtDate, setNextCourtDate] = useState('');

    const [clients, setClients] = useState<Client[]>([]);
    const [lawyers, setLawyers] = useState<Lawyer[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
                generateCaseNumber(workspaceId),
            ]);

            setClients(clientsData);
            setLawyers(lawyersData);
            setCaseNumber(generatedNumber);
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Failed to load clients and lawyers');
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!clientId) {
            alert('Please select a client');
            return;
        }

        if (!lawyerId) {
            alert('Please select a lawyer');
            return;
        }

        if (!nextCourtDate) {
            alert('Please select a court date');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await createMatter({
                caseNumber,
                name: matterName,
                clientId,
                assignedLawyerId: lawyerId,
                workspaceId,
                court: court || undefined,
                judge: judge || undefined,
                nextCourtDate: new Date(nextCourtDate),
            });

            if (result.success) {
                // Reset form
                setMatterName('');
                setClientId('');
                setLawyerId('');
                setCourt('');
                setJudge('');
                setNextCourtDate('');

                alert('Matter created successfully!');
                onSuccess?.();
                onClose();
            } else {
                alert('Failed to create matter: ' + result.error);
            }
        } catch (error) {
            console.error('Error creating matter:', error);
            alert('An error occurred while creating the matter');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Add New Matter</h2>
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
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Name of Matter *</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="e.g. State v. Johnson"
                                    value={matterName}
                                    onChange={(e) => setMatterName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className={styles.row}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Case Number</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={caseNumber}
                                        onChange={(e) => setCaseNumber(e.target.value)}
                                        required
                                        disabled
                                    />
                                    <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                                        Auto-generated
                                    </p>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Next Court Date *</label>
                                    <input
                                        type="date"
                                        className={styles.input}
                                        value={nextCourtDate}
                                        onChange={(e) => setNextCourtDate(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Client *</label>
                                <select
                                    className={styles.select}
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    required
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
                                <label className={styles.label}>Court</label>
                                <select
                                    className={styles.select}
                                    value={court}
                                    onChange={(e) => setCourt(e.target.value)}
                                >
                                    <option value="">Select Court...</option>
                                    <option>High Court of Lagos State</option>
                                    <option>Federal High Court</option>
                                    <option>Court of Appeal</option>
                                    <option>Supreme Court</option>
                                    <option>Magistrate Court</option>
                                    <option>Customary Court</option>
                                    <option>Sharia Court</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Presiding Judge</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="e.g. Hon. Justice A.B. Cole"
                                    value={judge}
                                    onChange={(e) => setJudge(e.target.value)}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Lawyer Assigned *</label>
                                <select
                                    className={styles.select}
                                    value={lawyerId}
                                    onChange={(e) => setLawyerId(e.target.value)}
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
                                    <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                                        No lawyers found. Invite team members first.
                                    </p>
                                )}
                            </div>
                        </form>
                    )}
                </div>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.cancelBtn} disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button
                        className={styles.submitBtn}
                        onClick={handleSubmit}
                        disabled={isSubmitting || isLoadingData}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader size={16} className="animate-spin" />
                                <span>Creating...</span>
                            </>
                        ) : (
                            <>
                                <Gavel size={16} />
                                <span>Add Matter</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddMatterModal;
