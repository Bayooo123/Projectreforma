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
    const [selectedLawyerIds, setSelectedLawyerIds] = useState<string[]>([]);

    // UI State
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
            setNextDate('');
            setSelectedLawyerIds([userId]);
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
        // Default to today for the proceeding date
        setCourtDate(new Date().toISOString().split('T')[0]);
        // Default selected lawyers to those already assigned to the matter
        const assignedIds = matter.lawyers.map(l => l.lawyer.id);
        if (assignedIds.length > 0) {
            setSelectedLawyerIds(assignedIds);
        } else {
            setSelectedLawyerIds([userId]);
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
            const result = await adjournMatter(
                selectedMatter.id,
                nextDate ? new Date(nextDate) : undefined,
                proceedings,
                undefined, // No specific adjournedFor reason passed from UI anymore
                userId,
                selectedLawyerIds.length > 0 ? selectedLawyerIds : [userId],
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

    const toggleLawyer = (lawyerId: string) => {
        setSelectedLawyerIds(prev =>
            prev.includes(lawyerId)
                ? prev.filter(id => id !== lawyerId)
                : [...prev, lawyerId]
        );
    };

    const handleBack = () => {
        setStep('select_matter');
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
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Date of Proceeding *</label>
                                    <input
                                        type="date"
                                        className={styles.input}
                                        value={courtDate}
                                        onChange={(e) => setCourtDate(e.target.value)}
                                        required
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">When did the court sit?</p>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Lawyers in Appearance</label>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {lawyers.length > 0 ? (
                                            lawyers.map(lawyer => (
                                                <button
                                                    key={lawyer.id}
                                                    type="button"
                                                    onClick={() => toggleLawyer(lawyer.id)}
                                                    className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${selectedLawyerIds.includes(lawyer.id)
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    {lawyer.name}
                                                </button>
                                            ))
                                        ) : (
                                            <p className="text-[10px] text-slate-400 italic">Loading...</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.label}>Summary of What Happened *</label>
                                <textarea
                                    className={styles.textarea}
                                    style={{ minHeight: '120px' }}
                                    rows={5}
                                    placeholder="Describe the proceedings..."
                                    value={proceedings}
                                    onChange={(e) => setProceedings(e.target.value)}
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className="border-t border-slate-200 pt-4 mt-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <Calendar size={16} className="text-slate-400" />
                                    <span className="text-sm font-medium text-slate-700">Next Adjournment (Optional)</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={styles.label}>Adjournment Date</label>
                                        <input
                                            type="date"
                                            className={styles.input}
                                            value={nextDate}
                                            onChange={(e) => setNextDate(e.target.value)}
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1">Notifications will be scheduled for this date.</p>
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
