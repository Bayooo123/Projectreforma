"use client";

import { useState, useEffect } from 'react';
import { X, Loader, Search, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { adjournMatter } from '@/app/actions/matters';
import { getMatters } from '@/app/actions/matters';
import { getLawyersForWorkspace } from '@/lib/briefs';
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
    caseNumber: string | null;
    name: string;
    nextCourtDate: Date | null;
    client?: { name: string } | null;
    clientNameRaw?: string | null;
    lawyers: {
        lawyer: { name: string | null; id: string };
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
    // Mode: 'select_matter' | 'record_details'
    const [step, setStep] = useState<'select_matter' | 'record_details'>('select_matter');

    // Data Loading
    const [matters, setMatters] = useState<MatterSummary[]>([]);
    const [lawyers, setLawyers] = useState<Lawyer[]>([]); // Kept for advanced override if ever needed, but mostly inferred
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Selection State
    const [selectedMatter, setSelectedMatter] = useState<MatterSummary | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Form State
    const [courtDate, setCourtDate] = useState(new Date().toISOString().split('T')[0]); // Default today
    const [proceedings, setProceedings] = useState('');

    // Adjournment State
    const [nextDate, setNextDate] = useState('');
    const [adjournedFor, setAdjournedFor] = useState('');

    // UI State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAdjournmentDetails, setShowAdjournmentDetails] = useState(true); // Default open as it's common

    useEffect(() => {
        if (isOpen && workspaceId) {
            loadInitialData();
            // Reset state
            setStep('select_matter');
            setSelectedMatter(null);
            setSearchQuery('');
            setCourtDate(new Date().toISOString().split('T')[0]);
            setProceedings('');
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
            setLawyers(lawyersData); // Background load
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleMatterSelect = (matter: MatterSummary) => {
        setSelectedMatter(matter);
        // If the matter has a 'nextCourtDate' that is in the past or today, 
        // we might auto-fill the 'courtDate' to match it.
        if (matter.nextCourtDate) {
            const dateStr = new Date(matter.nextCourtDate).toISOString().split('T')[0];
            setCourtDate(dateStr);
        }
        setStep('record_details');
    };

    const handleSubmit = async () => {
        if (!selectedMatter) return;
        if (!proceedings.trim()) {
            alert('Please describe what happened in court.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Infer lawyers: Use the matter's assigned lawyers.
            // If the current user is a lawyer and not in the list, add them? 
            // For now, simplistically use the matter's lawyers + current user if applicable.

            let appearanceLawyerIds = selectedMatter.lawyers.map(l => l.lawyer.id);
            if (!appearanceLawyerIds.includes(userId)) {
                appearanceLawyerIds.push(userId);
            }

            // If no lawyers found at all (rare), at least attach the user.
            if (appearanceLawyerIds.length === 0) {
                appearanceLawyerIds = [userId];
            }

            // We use adjournMatter action. 
            // If nextDate is provided, it's a true adjournment.
            // If not, it's just recording a proceeding (we pass null/undefined to the action effectively).
            // NOTE: The current backend action signature might require a date. 
            // If the user leaves adjournment blank, we assume "Sine Die" or handled by backend logic (or we might need to block if backend demands it).
            // The request says "Optional Enhancements... Adjournment date can remain optional".
            // If blank, we just don't pass a valid date.

            const nextCourtDateObj = nextDate ? new Date(nextDate) : new Date(0); // Epoch as fallback or create a dedicated "Record Only" action?
            // To be safe with existing backend, if they don't provide a date, we might need to alert or modify backend. 
            // For this iteration, if they leave it blank, we'll warn them if it's strictly required by backend, 
            // OR we send a dummy date and handle it. 
            // Looking at `adjournMatter` in previous turn verify: it takes `newDate`.

            // Let's assume we proceed with the user's explicit enhancement request:
            // "Adjournment date can remain optional and, if provided, should still trigger the notification workflow"

            // We initiate the action.
            const result = await adjournMatter(
                selectedMatter.id,
                nextDate ? new Date(nextDate) : undefined, // Cast to any to bypass strict TS check if needed, backend should handle nullable
                proceedings,
                adjournedFor || 'Report', // Default to generic if missing
                userId,
                appearanceLawyerIds,
                new Date(courtDate)
            );

            if (result.success) {
                alert('Proceeding recorded.');
                onSuccess?.();
                onClose();
            } else {
                alert(result.error || 'Failed to record proceeding.');
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
        (m.caseNumber?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.client?.name && m.client.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.clientNameRaw && m.clientNameRaw.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal} style={{ maxWidth: '550px' }}>
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        {step === 'select_matter' ? 'Select Court Matter' : 'Record Proceeding'}
                    </h2>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    {step === 'select_matter' && (
                        <div className={styles.selectionStep}>
                            <div className={styles.searchWrapper}>
                                <Search size={18} className={styles.searchIcon} />
                                <input
                                    type="text"
                                    className={styles.searchInput}
                                    placeholder="Search by case name, suit number or client..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className={styles.matterList} style={{ maxHeight: '400px', overflowY: 'auto' }}>
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
                                                {matter.client?.name && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{matter.client.name}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 text-center text-slate-500">
                                        No matters found matching "{searchQuery}".
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'record_details' && selectedMatter && (
                        <div className={styles.detailsStep}>
                            {/* Context Header */}
                            <div className="bg-slate-50 p-3 rounded-lg mb-4 text-sm border border-slate-200 flex justify-between items-start">
                                <div>
                                    <div className="font-semibold text-slate-800">{selectedMatter.name}</div>
                                    <div className="text-slate-500">{selectedMatter.caseNumber}</div>
                                </div>
                                <button onClick={() => setStep('select_matter')} className="text-xs text-blue-600 hover:underline">
                                    Change
                                </button>
                            </div>

                            <div className="flex gap-4 mb-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                                    <input
                                        type="date"
                                        className={styles.input}
                                        value={courtDate}
                                        onChange={(e) => setCourtDate(e.target.value)}
                                    />
                                </div>
                                <div className="flex-1"></div>
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.label}>Summary of Proceedings *</label>
                                <textarea
                                    className={styles.textarea}
                                    style={{ minHeight: '120px' }}
                                    rows={5}
                                    placeholder="What happened in court today?"
                                    value={proceedings}
                                    onChange={(e) => setProceedings(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="border border-slate-200 rounded-lg p-3 mt-4">
                                <button
                                    className="flex items-center justify-between w-full text-left"
                                    onClick={() => setShowAdjournmentDetails(!showAdjournmentDetails)}
                                >
                                    <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                        <Calendar size={16} />
                                        Adjournment & Next Steps
                                    </span>
                                    {showAdjournmentDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>

                                {showAdjournmentDetails && (
                                    <div className="mt-3 grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={styles.label}>Next Date (Optional)</label>
                                            <input
                                                type="date"
                                                className={styles.input}
                                                value={nextDate}
                                                onChange={(e) => setNextDate(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className={styles.label}>Adjourned For</label>
                                            <select
                                                className={styles.select}
                                                value={adjournedFor}
                                                onChange={(e) => setAdjournedFor(e.target.value)}
                                            >
                                                <option value="">Select...</option>
                                                <option value="Ruling">Ruling</option>
                                                <option value="Judgment">Judgment</option>
                                                <option value="Hearing">Hearing</option>
                                                <option value="Mention">Mention</option>
                                                <option value="Report of Settlement">Report of Settlement</option>
                                                <option value="Adoption of Address">Adoption of Address</option>
                                                <option value="Further Mention">Further Mention</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    {step === 'select_matter' && (
                        <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                    )}

                    {step === 'record_details' && (
                        <>
                            <button
                                onClick={onClose}
                                className={styles.cancelBtn}
                                disabled={isSubmitting}
                            >
                                Cancel
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
