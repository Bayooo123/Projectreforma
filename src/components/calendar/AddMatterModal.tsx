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
    const [courtSummary, setCourtSummary] = useState('');
    const [proceduralStatus, setProceduralStatus] = useState('');

    // Hybrid Client Selection State
    const [clientSearch, setClientSearch] = useState('');
    const [isClientListVisible, setIsClientListVisible] = useState(false);
    const [isNewClient, setIsNewClient] = useState(false);

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
            const [clientsData, lawyersData] = await Promise.all([
                getClientsForWorkspace(workspaceId),
                getLawyersForWorkspace(workspaceId),
            ]);

            setClients(clientsData);
            setLawyers(lawyersData);
            setCaseNumber(''); // Default to empty for manual entry
        } catch (error) {
            console.error('Error loading data:', error);
            // Don't alert here to avoid annoying the user if it's transient
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleClientChange = (value: string) => {
        setClientSearch(value);
        setIsClientListVisible(true);

        // Check if value matches an existing client exactly
        const exactMatch = clients.find(c => c.name.toLowerCase() === value.toLowerCase());
        if (exactMatch) {
            setClientId(exactMatch.id);
            setIsNewClient(false);
        } else {
            setClientId('');
            setIsNewClient(value.trim().length > 0);
        }
    };

    const selectClient = (client: Client) => {
        setClientId(client.id);
        setClientSearch(client.name);
        setIsClientListVisible(false);
        setIsNewClient(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!clientId && !clientSearch) {
            alert('Please enter or select a client');
            return;
        }

        if (!lawyerId) {
            alert('Please select a lawyer');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await createMatter({
                caseNumber,
                name: matterName,
                clientId: clientId || undefined,
                clientNameRaw: !clientId ? clientSearch : undefined,
                assignedLawyerId: lawyerId,
                workspaceId,
                court: court || undefined,
                judge: judge || undefined,
                nextCourtDate: nextCourtDate ? new Date(nextCourtDate) : undefined,
                proceduralStatus: proceduralStatus || undefined,
                proceedings: courtSummary || undefined, // Pass summary
            });

            if (result.success) {
                // Reset form
                setMatterName('');
                setClientId('');
                setLawyerId('');
                setCourt('');
                setJudge('');
                setNextCourtDate('');
                setCourtSummary(''); // Reset summary

                alert('Matter created successfully!');
                onSuccess?.();
                onClose();
            } else {
                alert(result.error);
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
                                    <label className={styles.label}>Case Number *</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={caseNumber}
                                        onChange={(e) => setCaseNumber(e.target.value)}
                                        required
                                        placeholder="e.g. FHC/L/CS/..."
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Procedural Status</label>
                                    <select
                                        className={styles.select}
                                        value={proceduralStatus}
                                        onChange={(e) => setProceduralStatus(e.target.value)}
                                    >
                                        <option value="">Select Status...</option>
                                        <option value="Mention">Mention</option>
                                        <option value="CMC">Case Management Conference (CMC)</option>
                                        <option value="Hearing">Hearing</option>
                                        <option value="Trial">Trial</option>
                                        <option value="Adoption of Address">Adoption of Address</option>
                                        <option value="Judgment">Judgment</option>
                                        <option value="Appeal">Appeal</option>
                                        <option value="Ruling">Ruling</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formGroup} style={{ position: 'relative' }}>
                                <label className={styles.label}>Client *</label>
                                <div className={styles.hybridInputWrapper}>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="Search existing or type new client name..."
                                        value={clientSearch}
                                        onChange={(e) => handleClientChange(e.target.value)}
                                        onFocus={() => setIsClientListVisible(true)}
                                        required
                                    />
                                    {isNewClient && !clientId && (
                                        <div className={styles.newClientBadge}>New Client Entry</div>
                                    )}
                                </div>

                                {isClientListVisible && clientSearch.trim().length > 0 && (
                                    <div className={styles.dropdown}>
                                        {clients
                                            .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                                            .map(client => (
                                                <div
                                                    key={client.id}
                                                    className={styles.dropdownItem}
                                                    onClick={() => selectClient(client)}
                                                >
                                                    <span className={styles.clientName}>{client.name}</span>
                                                    {client.company && <span className={styles.clientCompany}>{client.company}</span>}
                                                </div>
                                            ))}
                                        {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                                            <div className={styles.noResults}>
                                                No results found. This will be saved as a new record.
                                            </div>
                                        )}
                                        <div
                                            className={styles.closeDropdown}
                                            onClick={() => setIsClientListVisible(false)}
                                        >
                                            Close
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Court</label>
                                <select
                                    className={styles.select}
                                    value={court}
                                    onChange={(e) => setCourt(e.target.value)}
                                >
                                    <option value="">Select Court...</option>
                                    <option>State High Court</option>
                                    <option>Federal High Court</option>
                                    <option>National Industrial Court</option>
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
                                <label className={styles.label}>Lead Counsel *</label>
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

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Next Court Date (Optional)</label>
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={nextCourtDate}
                                    onChange={(e) => setNextCourtDate(e.target.value)}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>What happened in court / Court summary (Optional)</label>
                                <textarea
                                    className={styles.input}
                                    style={{ height: '100px', resize: 'vertical' }}
                                    placeholder="Brief summary of proceedings on the selected date..."
                                    value={courtSummary}
                                    onChange={(e) => setCourtSummary(e.target.value)}
                                />
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
