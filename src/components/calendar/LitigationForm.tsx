
"use client";

import { useState, useEffect } from 'react';
import { X, Gavel, Loader, Search } from 'lucide-react';
import { createMatter, adjournMatter } from '@/app/actions/matters';
import { getClientsForWorkspace, getLawyersForWorkspace, getBriefs } from '@/lib/briefs';
import { useRouter } from 'next/navigation';
import styles from './LitigationForm.module.css';

interface LitigationFormProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'create' | 'update';
    workspaceId: string;
    userId: string;
    onSuccess?: () => void;
    initialMatter?: any; // Only used for update mode if already selected
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

interface MatterSummary {
    id: string;
    name: string;
    caseNumber: string | null;
    clientId: string | null;
    client?: { name: string } | null;
    lawyers?: { lawyer: { id: string; name: string | null } }[];
}

const LitigationForm = ({
    isOpen,
    onClose,
    mode,
    workspaceId,
    userId,
    onSuccess,
    initialMatter
}: LitigationFormProps) => {
    // --- State ---
    const router = useRouter();
    const [step, setStep] = useState<'select' | 'form'>(mode === 'update' && !initialMatter ? 'select' : 'form');

    // Data List State
    const [clients, setClients] = useState<Client[]>([]);
    const [lawyers, setLawyers] = useState<Lawyer[]>([]);
    const [matters, setMatters] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Form Selection State
    const [selectedMatter, setSelectedMatter] = useState<any>(initialMatter || null);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [clientSearch, setClientSearch] = useState('');
    const [matterSearch, setMatterSearch] = useState('');
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

    // Form Field State
    const [matterName, setMatterName] = useState('');
    const [isNameOverridden, setIsNameOverridden] = useState(false);
    const [opponentName, setOpponentName] = useState('');
    const [opponentCounsel, setOpponentCounsel] = useState('');
    const [lawyerInChargeId, setLawyerInChargeId] = useState('');
    const [court, setCourt] = useState('');
    const [judge, setJudge] = useState('');
    const [proceedingDate, setProceedingDate] = useState(new Date().toISOString().split('T')[0]);
    const [adjournedFor, setAdjournedFor] = useState('');
    const [selectedLawyerIds, setSelectedLawyerIds] = useState<string[]>([]);
    const [isExternalCounsel, setIsExternalCounsel] = useState(false);
    const [externalCounselName, setExternalCounselName] = useState('');
    const [nextCourtDate, setNextCourtDate] = useState('');
    const [courtSummary, setCourtSummary] = useState('');
    const [pin, setPin] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Effects ---
    useEffect(() => {
        if (isOpen && workspaceId) {
            loadData();
            resetForm();
        }
    }, [isOpen, workspaceId, mode, initialMatter]);

    // Auto-generate matter name (only in create mode)
    useEffect(() => {
        if (mode === 'create' && !isNameOverridden) {
            const clientPart = clientSearch.trim() || 'Client';
            const opponentPart = opponentName.trim();
            setMatterName(opponentPart ? `${clientPart} v ${opponentPart}` : clientPart);
        }
    }, [clientSearch, opponentName, isNameOverridden, mode]);

    const loadData = async () => {
        setIsLoadingData(true);
        try {
            const [lawyersData, clientsData] = await Promise.all([
                getLawyersForWorkspace(workspaceId),
                getClientsForWorkspace(workspaceId)
            ]);
            setLawyers(lawyersData);
            setClients(clientsData);

            if (mode === 'update') {
                const briefsData = await getBriefs(workspaceId);
                // Extract unique matters from briefs
                const uniqueMatters = briefsData
                    .filter(b => b.matter)
                    .map(b => b.matter);
                setMatters(uniqueMatters);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoadingData(false);
        }
    };

    const resetForm = () => {
        setStep(mode === 'update' && !initialMatter ? 'select' : 'form');
        setSelectedMatter(initialMatter || null);
        setSelectedClient(null);
        setClientSearch('');
        setMatterSearch('');
        setMatterName('');
        setIsNameOverridden(false);
        setOpponentName('');
        setOpponentCounsel('');
        setLawyerInChargeId('');
        setCourt('');
        setJudge('');
        setProceedingDate(new Date().toISOString().split('T')[0]);
        setSelectedLawyerIds(mode === 'update' ? [] : [userId]);
        setIsExternalCounsel(false);
        setExternalCounselName('');
        setNextCourtDate('');
        setCourtSummary('');
        setPin('');
    };

    // --- Handlers ---
    const handleSelectMatter = (matter: any) => {
        setSelectedMatter(matter);
        setMatterName(matter.name);
        setOpponentName(matter.opponentName || '');
        setOpponentCounsel(matter.opponentCounsel || '');
        setLawyerInChargeId(matter.lawyerInChargeId || '');
        setCourt(matter.court || '');
        setJudge(matter.judge || '');

        // Auto-select lawyers if available
        if (matter.lawyers) {
            const ids = matter.lawyers.map((l: any) => l.lawyerId);
            setSelectedLawyerIds(ids);
        } else {
            setSelectedLawyerIds([userId]);
        }

        setStep('form');
    };

    const handleSelectClient = (client: Client) => {
        setSelectedClient(client);
        setClientSearch(client.name);
        setIsClientDropdownOpen(false);
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

        if (mode === 'create' && !clientSearch.trim()) {
            alert('Please identify the client.');
            return;
        }

        if (mode === 'update' && !selectedMatter) {
            alert('Please select a matter.');
            return;
        }

        setIsSubmitting(true);
        try {
            if (mode === 'create') {
                const result = await createMatter({
                    name: matterName,
                    opponentName: opponentName || undefined,
                    opponentCounsel: opponentCounsel || undefined,
                    lawyerInChargeId: lawyerInChargeId || undefined,
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
                    createdById: userId,
                    externalCounselName: isExternalCounsel ? externalCounselName : undefined
                });

                if (result.success) {
                    onSuccess?.();
                    onClose();
                } else {
                    alert(result.error);
                }
            } else {
                // Update mode
                const result = await adjournMatter(
                    selectedMatter.id,
                    nextCourtDate ? new Date(nextCourtDate) : undefined,
                    courtSummary,
                    adjournedFor || undefined,
                    userId,
                    selectedLawyerIds.length > 0 ? selectedLawyerIds : [userId],
                    new Date(proceedingDate),
                    pin,
                    isExternalCounsel ? externalCounselName : undefined,
                    judge || undefined
                );

                if (result.success) {
                    onSuccess?.();
                    onClose();
                } else {
                    alert(result.error || 'Failed to record proceeding.');
                }
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('An error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        (c.company && c.company.toLowerCase().includes(clientSearch.toLowerCase()))
    );

    const filteredMatters = matters.filter(m =>
        m.name.toLowerCase().includes(matterSearch.toLowerCase()) ||
        (m.caseNumber && m.caseNumber.toLowerCase().includes(matterSearch.toLowerCase()))
    );

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        {mode === 'create' ? 'Add New Matter' : 'Record Proceeding'}
                    </h2>
                    <button onClick={onClose} className={styles.closeBtn} disabled={isSubmitting}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    {step === 'select' && (
                        <div className="flex flex-col gap-4">
                            <div className={styles.hybridInputWrapper}>
                                <div className="relative">
                                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        className={styles.input}
                                        style={{ paddingLeft: '2.5rem' }}
                                        placeholder="Search by matter name or case number..."
                                        value={matterSearch}
                                        onChange={(e) => setMatterSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                                {isLoadingData ? (
                                    <div className="py-8 flex justify-center"><Loader className="animate-spin text-slate-400" /></div>
                                ) : filteredMatters.length > 0 ? (
                                    filteredMatters.map(m => (
                                        <div
                                            key={m.id}
                                            className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                                            onClick={() => handleSelectMatter(m)}
                                        >
                                            <div className="font-medium text-slate-900">{m.name}</div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {m.caseNumber && <span>{m.caseNumber} • </span>}
                                                {m.client?.name || 'Unassigned Client'}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 text-center text-slate-400 text-sm">
                                        No matches found.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'form' && (
                        <form className={styles.form} onSubmit={handleSubmit}>
                            {mode === 'update' && selectedMatter && (
                                <div className={styles.contextHeader}>
                                    <div>
                                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Target Matter</div>
                                        <div className="font-semibold text-slate-800">{selectedMatter.name}</div>
                                        <div className="text-xs text-slate-500">{selectedMatter.caseNumber || 'No case number'}</div>
                                    </div>
                                    {!initialMatter && (
                                        <button
                                            type="button"
                                            onClick={() => setStep('select')}
                                            className="text-xs text-blue-600 hover:underline font-medium"
                                        >
                                            Change
                                        </button>
                                    )}
                                </div>
                            )}

                            {mode === 'create' && (
                                <>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Name of Matter (Auto-generated) *</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            placeholder="e.g. State v. Johnson"
                                            value={matterName}
                                            onChange={(e) => {
                                                setMatterName(e.target.value);
                                                setIsNameOverridden(true);
                                            }}
                                            required
                                        />
                                        <p className="text-[10px] text-slate-400 italic">Will auto-update as you type names unless manually edited.</p>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Client Name *</label>
                                        <div className={styles.hybridInputWrapper}>
                                            <input
                                                type="text"
                                                className={styles.input}
                                                placeholder="Search or type new client..."
                                                value={clientSearch}
                                                onChange={(e) => {
                                                    setClientSearch(e.target.value);
                                                    setSelectedClient(null);
                                                    setIsClientDropdownOpen(true);
                                                }}
                                                onFocus={() => setIsClientDropdownOpen(true)}
                                                required
                                                autoComplete="off"
                                            />
                                            {!selectedClient && clientSearch.trim() && (
                                                <span className={styles.newClientBadge}>New Client</span>
                                            )}
                                            {isClientDropdownOpen && (clientSearch || clients.length > 0) && (
                                                <div className={styles.dropdown}>
                                                    {filteredClients.map(c => (
                                                        <div
                                                            key={c.id}
                                                            className={styles.dropdownItem}
                                                            onClick={() => handleSelectClient(c)}
                                                        >
                                                            <div className={styles.clientName}>{c.name}</div>
                                                            {c.company && <div className={styles.clientCompany}>{c.company}</div>}
                                                        </div>
                                                    ))}
                                                    <div className={styles.closeDropdown} onClick={() => setIsClientDropdownOpen(false)}>Close</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Opposing Party Name</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            placeholder="Enter the name of the opponent..."
                                            value={opponentName}
                                            onChange={(e) => setOpponentName(e.target.value)}
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Lawyer in Charge *</label>
                                        <select
                                            className={styles.select}
                                            value={lawyerInChargeId}
                                            onChange={(e) => setLawyerInChargeId(e.target.value)}
                                            required
                                        >
                                            <option value="">Select responsible lawyer...</option>
                                            {lawyers.map(l => (
                                                <option key={l.id} value={l.id}>{l.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Court</label>
                                    <select className={styles.select} value={court} onChange={(e) => setCourt(e.target.value)}>
                                        <option value="">Select Court...</option>
                                        <option>State High Court</option>
                                        <option>Federal High Court</option>
                                        <option>National Industrial Court</option>
                                        <option>Court of Appeal</option>
                                        <option>Supreme Court</option>
                                        <option>Magistrate Court</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Judge</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="e.g. Hon. Justice A.B. Cole"
                                        value={judge}
                                        onChange={(e) => setJudge(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
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
                                    <label className={styles.label}>Next Court Date</label>
                                    <input
                                        type="date"
                                        className={styles.input}
                                        value={nextCourtDate}
                                        onChange={(e) => setNextCourtDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            {nextCourtDate && (
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Purpose of Adjournment (Adjourned For)</label>
                                    <select
                                        className={styles.select}
                                        value={adjournedFor}
                                        onChange={(e) => setAdjournedFor(e.target.value)}
                                        required
                                    >
                                        <option value="">Select purpose...</option>
                                        <option value="Ruling">Ruling</option>
                                        <option value="Judgment">Judgment</option>
                                        <option value="Hearing">Hearing</option>
                                        <option value="Further Arguments">Further Arguments</option>
                                        <option value="Mention">Mention</option>
                                        <option value="Adoption of Address">Adoption of Address</option>
                                        <option value="Cross Examination">Cross Examination</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            )}

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Lawyers in Appearance</label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {lawyers.map(l => (
                                        <button
                                            key={l.id}
                                            type="button"
                                            onClick={() => toggleLawyer(l.id)}
                                            className={`${styles.lawyerBtn} ${selectedLawyerIds.includes(l.id) ? styles.lawyerBtnActive : styles.lawyerBtnInactive}`}
                                        >
                                            {l.name}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setIsExternalCounsel(!isExternalCounsel)}
                                        className={`${styles.lawyerBtn} ${isExternalCounsel ? styles.lawyerBtnActive : styles.lawyerBtnInactive}`}
                                        style={isExternalCounsel ? { background: '#6366f1' } : {}}
                                    >
                                        + External Counsel
                                    </button>
                                </div>
                                {isExternalCounsel && (
                                    <input
                                        type="text"
                                        placeholder="Enter External Counsel Name"
                                        className={`${styles.input} mt-2`}
                                        style={{ fontSize: '0.75rem' }}
                                        value={externalCounselName}
                                        onChange={(e) => setExternalCounselName(e.target.value)}
                                    />
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>What happened in court / Summary</label>
                                <textarea
                                    className={styles.textarea}
                                    style={{ height: '120px' }}
                                    placeholder="Describe the proceedings..."
                                    value={courtSummary}
                                    onChange={(e) => setCourtSummary(e.target.value)}
                                />
                            </div>

                            {mode === 'update' && (
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Litigation Security PIN</label>
                                    <input
                                        type="password"
                                        maxLength={5}
                                        placeholder="Enter 5-digit PIN"
                                        className={styles.input}
                                        style={{ width: '150px', letterSpacing: '0.2rem', textAlign: 'center' }}
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                    />
                                </div>
                            )}
                        </form>
                    )}
                </div>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.cancelBtn} disabled={isSubmitting}>
                        Cancel
                    </button>
                    {step === 'form' && (
                        <button
                            className={styles.submitBtn}
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader size={16} className="animate-spin" />
                                    <span>{mode === 'create' ? 'Creating...' : 'Recording...'}</span>
                                </>
                            ) : (
                                <>
                                    <Gavel size={16} />
                                    <span>{mode === 'create' ? 'Add Matter' : 'Record Proceeding'}</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div >
    );
};

export default LitigationForm;
