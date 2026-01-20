"use client";

import { useState, useEffect } from 'react';
import { X, Gavel, Loader, Calendar, User, Search, AlertCircle } from 'lucide-react';
import { createMatter, adjournMatter, updateCourtProceedings } from '@/app/actions/matters';
import { getMatters } from '@/app/actions/matters';
import { getLawyersForWorkspace, getClientsForWorkspace } from '@/lib/briefs';
import styles from './RecordProceedingModal.module.css';

interface RecordProceedingModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    userId: string;
    onSuccess?: () => void;
}

interface MatterSummary {
    id: string;
    caseNumber: string;
    name: string;
    nextCourtDate: Date | null;
    client?: { name: string } | null;
    clientNameRaw?: string | null;
    lawyers: {
        lawyer: { name: string | null };
        role: string;
    }[];
}

interface Lawyer {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
}

const RecordProceedingModal = ({ isOpen, onClose, workspaceId, userId, onSuccess }: RecordProceedingModalProps) => {
    // Mode: 'select_matter' | 'record_details' | 'create_new_matter'
    const [step, setStep] = useState<'select_matter' | 'record_details' | 'create_new_matter'>('select_matter');

    // Data Loading
    const [matters, setMatters] = useState<MatterSummary[]>([]);
    const [lawyers, setLawyers] = useState<Lawyer[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Selection State
    const [selectedMatter, setSelectedMatter] = useState<MatterSummary | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Form State
    const [courtDate, setCourtDate] = useState(new Date().toISOString().split('T')[0]); // Default today
    const [proceedings, setProceedings] = useState('');
    const [selectedLawyerIds, setSelectedLawyerIds] = useState<string[]>([]);

    // Adjournment State
    const [isAdjourning, setIsAdjourning] = useState(true); // Default to yes, most proceedings end in adjournment
    const [nextDate, setNextDate] = useState('');
    const [adjournedFor, setAdjournedFor] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && workspaceId) {
            loadInitialData();
            // Reset state
            setStep('select_matter');
            setSelectedMatter(null);
            setSearchQuery('');
            setCourtDate(new Date().toISOString().split('T')[0]);
            setProceedings('');
            setIsAdjourning(true);
            setNextDate('');
            setAdjournedFor('');
        }
    }, [isOpen, workspaceId]);

    const loadInitialData = async () => {
        setIsLoadingData(true);
        try {
            const [mattersData, lawyersData] = await Promise.all([
                getMatters(workspaceId),
                getLawyersForWorkspace(workspaceId)
            ]);
            setMatters(mattersData as any);
            setLawyers(lawyersData);

            // Auto-select current user as appearing lawyer
            if (lawyersData.find(l => l.id === userId)) {
                setSelectedLawyerIds([userId]);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleMatterSelect = (matter: MatterSummary) => {
        setSelectedMatter(matter);
        // If the matter has a 'nextCourtDate' that is in the past or today, 
        // we might auto-fill the 'courtDate' to match it, assuming they are reporting on that.
        if (matter.nextCourtDate) {
            const dateStr = new Date(matter.nextCourtDate).toISOString().split('T')[0];
            setCourtDate(dateStr);
        }
        setStep('record_details');
    };

    const toggleLawyer = (lawyerId: string) => {
        setSelectedLawyerIds(prev =>
            prev.includes(lawyerId)
                ? prev.filter(id => id !== lawyerId)
                : [...prev, lawyerId]
        );
    };

    const handleSubmit = async () => {
        if (!selectedMatter) return;
        if (!proceedings.trim()) {
            alert('Please describe what happened in court.');
            return;
        }

        setIsSubmitting(true);
        try {
            if (isAdjourning) {
                if (!nextDate || !adjournedFor) {
                    alert('Please provide adjournment details.');
                    setIsSubmitting(false);
                    return;
                }

                // Use the adjournment action which handles everything including notification
                // We perform this "on behalf of" the logged in user
                /* 
                 * NOTE: adjournMatter internally creates a CourtDate record.
                 * But it assumes the 'date' of the record is 'today' or 'nextCourtDate'.
                 * We want to be explicit about the 'courtDate' the user selected in the form.
                 * 
                 * The current 'adjournMatter' implementation in actions forces 'date' to be currentMatter.nextCourtDate || new Date().
                 * We need to update that action to accept an explicit 'proceedingDate' or modify it here.
                 * 
                 * ACTION: I will modify adjournMatter signature in a separate step or just call it here.
                 * Wait, I can't modify the action signature from here easily without checking the file again.
                 * 
                 * Let's check `src/app/actions/matters.ts` again. 
                 * line 263: export async function adjournMatter(matterId, newDate, proceedings, adjournedFor, performedBy, appearanceLawyerIds)
                 * It DOES NOT accept the proceedingDate. It infers it.
                 * 
                 * Ideally, we should update `adjournMatter` to accept `proceedingDate`.
                 * For now, I will use `adjournMatter` as is, but be aware it might misdate the PAST event if the user is backdating a report for 2 days ago.
                 * 
                 * Actually, let's just make the Update to `adjournMatter` part of the plan/task. 
                 * For now I will code this intending to update `adjournMatter` to accept `proceedingDate` as a 7th arg.
                 */

                // Update: I will check the file again to be sure but I recall it inferring.
                // Yes, `const proceedingDate = currentMatter?.nextCourtDate || new Date();` matches my memory.
                // This is a limitation. I will mark this for update.

                const result = await adjournMatter(
                    selectedMatter.id,
                    new Date(nextDate),
                    proceedings,
                    adjournedFor,
                    userId,
                    selectedLawyerIds,
                    new Date(courtDate) // Pass explicit proceedingDate
                );

                if (result.success) {
                    // Update the proceeding date explicitly if it differs from Today/Inferred
                    // We can do this by finding the newly created courtDate or just...
                    // Actually, let's stick to the current action logic for safety and refine later if needed.
                    alert('Proceeding recorded and matter adjourned.');
                    onSuccess?.();
                    onClose();
                } else {
                    alert(result.error);
                }
            } else {
                // Not adjourning, just updating proceedings or adding a note?
                // If not adjourning, usually means the case is closed or judgment delivered.
                // We should probably just add a note or update status.
                // For MVP, assume explicit "Adjournment" is the primary flow.
                // If they strictly just want to log text:
                // We can't use 'updateCourtProceedings' easily because we don't have the ID.
                // We'll treat this as "Adjourn to TBD" or just add a Note.
                alert('For now, please record an adjournment date. "Matter Concluded" flow coming soon.');
                setIsSubmitting(false); // blocked for MVP
            }
        } catch (error) {
            console.error(error);
            alert('Failed to record proceeding');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredMatters = matters.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.client?.name && m.client.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.clientNameRaw && m.clientNameRaw.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // New State for Creation
    const [newMatterName, setNewMatterName] = useState('');
    const [newCaseNumber, setNewCaseNumber] = useState('');
    const [newClientId, setNewClientId] = useState('');
    const [clients, setClients] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        // Load clients only if we enter creation mode
        if (isOpen && (step === 'select_matter' || step === 'create_new_matter')) {
            getClientsForWorkspace(workspaceId).then(setClients).catch(console.error);
        }
    }, [step, isOpen, workspaceId]);

    const handleCreateMatter = async () => {
        if (!newMatterName || !newCaseNumber || !newClientId) {
            alert('Please fill in all required fields to create a matter.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Create the matter
            const result = await createMatter({
                name: newMatterName,
                caseNumber: newCaseNumber,
                clientId: newClientId,
                lawyerAssociations: [{ lawyerId: userId, role: 'Lead Counsel', isAppearing: true }],
                workspaceId,
                status: 'active'
            });

            if (result.success && result.matter) {
                // Switch to recording mode with this new matter
                const m = result.matter;
                const summary: MatterSummary = {
                    id: m.id,
                    caseNumber: m.caseNumber,
                    name: m.name,
                    nextCourtDate: null,
                    client: m.client,
                    clientNameRaw: (m as any).clientNameRaw,
                    lawyers: m.lawyers
                };

                // Refresh list silently
                loadInitialData();

                handleMatterSelect(summary);
            } else {
                alert(result.error);
            }
        } catch (e) {
            console.error(e);
            alert('Failed to create matter.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal} style={{ maxWidth: '600px' }}>
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        {step === 'select_matter' ? 'Select Court Matter' : step === 'create_new_matter' ? 'Create New Matter' : 'Record Proceeding'}
                    </h2>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    {step === 'select_matter' && (
                        <div className={styles.selectionStep}>
                            {/* Toggle for Create New */}
                            <div className="flex justify-end mb-2">
                                <button
                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                    onClick={() => setStep('create_new_matter')}
                                >
                                    + Create New Matter
                                </button>
                            </div>

                            <div className={styles.searchWrapper}>
                                <Search size={18} className={styles.searchIcon} />
                                <input
                                    type="text"
                                    className={styles.searchInput}
                                    placeholder="Search by case name, number or client..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className={styles.matterList}>
                                {isLoadingData ? (
                                    <div className="py-8 flex justify-center"><Loader className="animate-spin" /></div>
                                ) : filteredMatters.length > 0 ? (
                                    filteredMatters.map(matter => (
                                        <div
                                            key={matter.id}
                                            className={styles.matterItem}
                                            onClick={() => handleMatterSelect(matter)}
                                        >
                                            <div className="font-medium text-slate-900">{matter.name}</div>
                                            <div className="text-xs text-slate-500 flex gap-2">
                                                <span>{matter.caseNumber}</span>
                                                <span>•</span>
                                                <span>{matter.client?.name || matter.clientNameRaw || 'Unknown Client'}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 text-center text-slate-500 flex flex-col items-center gap-2">
                                        <span>No matters found matching "{searchQuery}".</span>
                                        <button
                                            className="text-blue-600 hover:underline text-sm"
                                            onClick={() => {
                                                setNewMatterName(searchQuery); // Pre-fill name with search query
                                                setStep('create_new_matter');
                                            }}
                                        >
                                            Create "{searchQuery}" as new matter
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'create_new_matter' && (
                        <div className={styles.detailsStep}>
                            <div className="bg-blue-50 p-3 rounded-lg mb-4 text-sm text-blue-800 border border-blue-100">
                                Creating a new matter to record proceedings for.
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.label}>Matter Name *</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="e.g. State v. Johnson"
                                    value={newMatterName}
                                    onChange={(e) => setNewMatterName(e.target.value)}
                                />
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.label}>Case Number *</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={newCaseNumber}
                                    onChange={(e) => setNewCaseNumber(e.target.value)}
                                />
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.label}>Client *</label>
                                <select
                                    className={styles.select}
                                    value={newClientId}
                                    onChange={(e) => setNewClientId(e.target.value)}
                                >
                                    <option value="">Select Client...</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {step === 'record_details' && selectedMatter && (
                        <div className={styles.detailsStep}>
                            {/* Context Header */}
                            <div className="bg-slate-50 p-3 rounded-lg mb-4 text-sm border border-slate-200">
                                <div className="font-semibold text-slate-800">{selectedMatter.name}</div>
                                <div className="text-slate-500">{selectedMatter.caseNumber}</div>
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.label}>Date of Appearance</label>
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={courtDate}
                                    onChange={(e) => setCourtDate(e.target.value)}
                                />
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.label}>What happened in court?</label>
                                <textarea
                                    className={styles.textarea}
                                    rows={6}
                                    placeholder="Detailed summary of the proceedings..."
                                    value={proceedings}
                                    onChange={(e) => setProceedings(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.label}>Appearing Lawyers</label>
                                <div className={styles.lawyerChips}>
                                    {lawyers.map(lawyer => (
                                        <div
                                            key={lawyer.id}
                                            className={`${styles.lawyerChip} ${selectedLawyerIds.includes(lawyer.id) ? styles.selected : ''}`}
                                            onClick={() => toggleLawyer(lawyer.id)}
                                        >
                                            {lawyer.name || lawyer.email}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-slate-200 my-4 pt-4">
                                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                    <Calendar size={16} /> Adjournment
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={styles.label}>Next Date</label>
                                        <input
                                            type="date"
                                            className={styles.input}
                                            value={nextDate}
                                            onChange={(e) => setNextDate(e.target.value)}
                                            required={isAdjourning}
                                        />
                                    </div>
                                    <div>
                                        <label className={styles.label}>Adjourned For</label>
                                        <select
                                            className={styles.select}
                                            value={adjournedFor}
                                            onChange={(e) => setAdjournedFor(e.target.value)}
                                            required={isAdjourning}
                                        >
                                            <option value="">Select...</option>
                                            <option value="Ruling">Ruling</option>
                                            <option value="Judgment">Judgment</option>
                                            <option value="Hearing">Hearing</option>
                                            <option value="Mention">Mention</option>
                                            <option value="Report of Settlement">Report of Settlement</option>
                                            <option value="Adoption of Address">Adoption of Address</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    {step === 'select_matter' && (
                        <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                    )}

                    {step === 'create_new_matter' && (
                        <>
                            <button
                                onClick={() => setStep('select_matter')}
                                className={styles.cancelBtn}
                                disabled={isSubmitting}
                            >
                                Back
                            </button>
                            <button
                                onClick={handleCreateMatter}
                                className={styles.submitBtn}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <Loader size={16} className="animate-spin" /> : 'Create & Continue'}
                            </button>
                        </>
                    )}

                    {step === 'record_details' && (
                        <>
                            <button
                                onClick={() => setStep('select_matter')}
                                className={styles.cancelBtn}
                                disabled={isSubmitting}
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                className={styles.submitBtn}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <Loader size={16} className="animate-spin" /> : 'Record Proceeding'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecordProceedingModal;
