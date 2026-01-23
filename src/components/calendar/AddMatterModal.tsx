"use client";

import { useState, useEffect } from 'react';
import { X, Gavel, Loader } from 'lucide-react';
import { createMatter } from '@/app/actions/matters';
import { generateCaseNumber } from '@/lib/matters';
import { getClientsForWorkspace, getLawyersForWorkspace } from '@/lib/briefs';
import { ASCOLP_LAWYERS } from '@/lib/firm-directory';
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
    const [court, setCourt] = useState('');
    const [judge, setJudge] = useState('');
    const [nextCourtDate, setNextCourtDate] = useState('');
    const [courtSummary, setCourtSummary] = useState('');
    const [proceduralStatus, setProceduralStatus] = useState('');
    const [selectedLawyers, setSelectedLawyers] = useState<{ lawyerId: string; role: string; isAppearing: boolean }[]>([]);

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

            // Filter lawyers to only include those in ASCOLP_LAWYERS directory
            const firmLawyerEmails = new Set(ASCOLP_LAWYERS.map(l => l.email.toLowerCase()));
            const filteredLawyers = lawyersData.filter(l => firmLawyerEmails.has(l.email?.toLowerCase() || ''));

            setClients(clientsData);
            setLawyers(filteredLawyers);
            setCaseNumber('');

            // Default to current user as Lead Counsel if they are in the firm
            const currentLawyer = filteredLawyers.find(l => l.id === userId);
            if (currentLawyer) {
                setSelectedLawyers([{ lawyerId: currentLawyer.id, role: 'Lead Counsel', isAppearing: true }]);
            }
        } catch (error) {
            console.error('Error loading data:', error);
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

        if (selectedLawyers.length === 0) {
            alert('Please assign at least one lawyer');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await createMatter({
                caseNumber,
                name: matterName,
                clientId: clientId || undefined,
                clientNameRaw: !clientId ? clientSearch : undefined,
                lawyerAssociations: selectedLawyers,
                workspaceId,
                court: court || undefined,
                judge: judge || undefined,
                nextCourtDate: nextCourtDate ? new Date(nextCourtDate) : undefined,
                proceduralStatus: proceduralStatus || undefined,
                proceedings: courtSummary || undefined,
            });

            if (result.success) {
                // Reset form
                setMatterName('');
                setClientId('');
                setSelectedLawyers([]);
                setCourt('');
                setJudge('');
                setNextCourtDate('');
                setCourtSummary('');

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
                                    <label className={styles.label}>Suit Number *</label>
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



                            <div className={styles.formGroup} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <label className={styles.label}>Legal Team *</label>
                                <div className="flex flex-col gap-3">
                                    {selectedLawyers.map((assoc, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <select
                                                className={styles.select}
                                                style={{ flex: 2 }}
                                                value={assoc.lawyerId}
                                                onChange={(e) => {
                                                    const newLawyers = [...selectedLawyers];
                                                    newLawyers[index].lawyerId = e.target.value;
                                                    setSelectedLawyers(newLawyers);
                                                }}
                                            >
                                                <option value="">Select Lawyer...</option>
                                                {lawyers.map(l => (
                                                    <option key={l.id} value={l.id}>{l.name}</option>
                                                ))}
                                            </select>
                                            <select
                                                className={styles.select}
                                                style={{ flex: 1 }}
                                                value={assoc.role}
                                                onChange={(e) => {
                                                    const newLawyers = [...selectedLawyers];
                                                    newLawyers[index].role = e.target.value;
                                                    setSelectedLawyers(newLawyers);
                                                }}
                                            >
                                                <option value="Lead Counsel">Lead Counsel</option>
                                                <option value="Co-Counsel">Co-Counsel</option>
                                                <option value="Appearing">Appearing</option>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedLawyers(prev => prev.filter((_, i) => i !== index))}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        className="text-sm text-blue-600 hover:underline font-medium text-left"
                                        onClick={() => setSelectedLawyers(prev => [...prev, { lawyerId: '', role: 'Co-Counsel', isAppearing: false }])}
                                    >
                                        + Add Consultant/Lawyer
                                    </button>
                                </div>
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
