"use client";

import { useState, useEffect } from 'react';
import { X, Gavel, Loader } from 'lucide-react';
import { createMatter } from '@/app/actions/matters';
import { generateCaseNumber } from '@/lib/matters';
import { getClientsForWorkspace, getLawyersForWorkspace } from '@/lib/briefs';
import { ASCOLP_LAWYERS } from '@/lib/firm-directory';
import { useRouter } from 'next/navigation';
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
    const [matterName, setMatterName] = useState('');
    const [court, setCourt] = useState('');
    const [judge, setJudge] = useState('');
    const [nextCourtDate, setNextCourtDate] = useState('');
    const [proceedingDate, setProceedingDate] = useState(new Date().toISOString().split('T')[0]);
    const [courtSummary, setCourtSummary] = useState('');
    const [workspaceLawyers, setWorkspaceLawyers] = useState<Lawyer[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [clientSearch, setClientSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const [selectedLawyerIds, setSelectedLawyerIds] = useState<string[]>([]);
    const [isLoadingClients, setIsLoadingClients] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (isOpen && workspaceId) {
            getLawyersForWorkspace(workspaceId).then(setWorkspaceLawyers);
            setIsLoadingClients(true);
            getClientsForWorkspace(workspaceId)
                .then(setClients)
                .finally(() => setIsLoadingClients(false));
        }
    }, [isOpen, workspaceId]);

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        (c.company && c.company.toLowerCase().includes(clientSearch.toLowerCase()))
    );

    const handleSelectClient = (client: Client) => {
        setSelectedClient(client);
        setClientSearch(client.name);
        setIsClientDropdownOpen(false);
    };

    const handleClientInputChange = (val: string) => {
        setClientSearch(val);
        setSelectedClient(null); // Reset selection if typing
        setIsClientDropdownOpen(true);
    };

    const toggleLawyer = (lawyerId: string) => {
        setSelectedLawyerIds(prev =>
            prev.includes(lawyerId)
                ? prev.filter(id => id !== lawyerId)
                : [...prev, lawyerId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!clientSearch.trim()) {
            alert('Please identify the client (representation is mandatory).');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await createMatter({
                name: matterName,
                workspaceId,
                court: court || undefined,
                judge: judge || undefined,
                nextCourtDate: nextCourtDate ? new Date(nextCourtDate) : undefined,
                proceedingDate: proceedingDate ? new Date(proceedingDate) : new Date(),
                proceedings: courtSummary || undefined,
                caseNumber: null,
                clientId: selectedClient?.id || null,
                clientName: selectedClient ? null : clientSearch,
                lawyerAssociations: selectedLawyerIds.map(id => ({
                    lawyerId: id,
                    role: 'appearing',
                    isAppearing: true
                })),
                createdById: userId
            });

            if (result.success) {
                const isNewClient = (result as any).isNewClient;
                const newClientId = result.matter.clientId;

                if (isNewClient) {
                    if (confirm(`Matter created successfully! A new client record for "${clientSearch}" has also been created. Would you like to complete their profile now?`)) {
                        router.push(`/management/clients?edit=${newClientId}`);
                    }
                } else {
                    alert('Matter created successfully!');
                }

                setMatterName('');
                setSelectedClient(null);
                setClientSearch('');
                setCourt('');
                setJudge('');
                setNextCourtDate('');
                setProceedingDate(new Date().toISOString().split('T')[0]);
                setCourtSummary('');
                setSelectedLawyerIds([]);

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
                            <p className="text-[10px] text-slate-400 mt-1 italic">Every entry must resolve to a Client and a Brief. A Brief will be auto-created.</p>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Client Name *</label>
                            <div className={styles.hybridInputWrapper}>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="Search or type new client name..."
                                    value={clientSearch}
                                    onChange={(e) => handleClientInputChange(e.target.value)}
                                    onFocus={() => setIsClientDropdownOpen(true)}
                                    required
                                    autoComplete="off"
                                />
                                {!selectedClient && clientSearch.trim() && (
                                    <span className={styles.newClientBadge}>New Client</span>
                                )}

                                {isClientDropdownOpen && (clientSearch || clients.length > 0) && (
                                    <div className={styles.dropdown}>
                                        {filteredClients.map(client => (
                                            <div
                                                key={client.id}
                                                className={styles.dropdownItem}
                                                onClick={() => handleSelectClient(client)}
                                            >
                                                <div className="flex flex-col">
                                                    <span className={styles.clientName}>{client.name}</span>
                                                    {client.company && <span className={styles.clientCompany}>{client.company}</span>}
                                                </div>
                                            </div>
                                        ))}
                                        {filteredClients.length === 0 && clientSearch && (
                                            <div className={styles.noResults}>
                                                No matches. "{clientSearch}" will be created as a new client.
                                            </div>
                                        )}
                                        <div
                                            className={styles.closeDropdown}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsClientDropdownOpen(false);
                                            }}
                                        >
                                            Close
                                        </div>
                                    </div>
                                )}
                            </div>
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
                            <label className={styles.label}>Present Date *</label>
                            <input
                                type="date"
                                className={styles.input}
                                value={proceedingDate}
                                onChange={(e) => setProceedingDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Lawyers in Appearance</label>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {workspaceLawyers.length > 0 ? (
                                    workspaceLawyers.map(lawyer => (
                                        <button
                                            key={lawyer.id}
                                            type="button"
                                            onClick={() => toggleLawyer(lawyer.id)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedLawyerIds.includes(lawyer.id)
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            {lawyer.name}
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-xs text-slate-400 italic">Loading firm directory...</p>
                                )}
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
                </div>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.cancelBtn} disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button
                        className={styles.submitBtn}
                        onClick={handleSubmit}
                        disabled={isSubmitting}
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
