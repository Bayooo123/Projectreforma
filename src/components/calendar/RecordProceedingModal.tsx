"use client";

import { useState, useEffect } from 'react';
import { X, Loader, Search, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { adjournMatter } from '@/app/actions/matters';
import { getBriefs, getLawyersForWorkspace } from '@/lib/briefs';
import styles from './RecordProceedingModal.module.css';

interface RecordProceedingModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    userId: string;
    onSuccess?: () => void;
}

interface BriefSummary {
    id: string;
    name: string;
    briefNumber: string;
    clientId: string | null;
    client: { name: string } | null;
    matterId: string | null;
    matter: {
        id: string;
        name: string;
        caseNumber: string | null;
        lawyers?: { lawyer: { id: string; name: string | null } }[]
    } | null;
}

interface Lawyer {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    designation?: string | null;
}

const RecordProceedingModal = ({ isOpen, onClose, workspaceId, userId, onSuccess }: RecordProceedingModalProps) => {
    // Mode: 'select_brief' | 'record_details'
    const [step, setStep] = useState<'select_brief' | 'record_details'>('select_brief');

    // Data Loading
    const [briefs, setBriefs] = useState<BriefSummary[]>([]);
    const [lawyers, setLawyers] = useState<Lawyer[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Selection State
    const [selectedBrief, setSelectedBrief] = useState<BriefSummary | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Form State
    const [courtDate, setCourtDate] = useState(new Date().toISOString().split('T')[0]);
    const [proceedings, setProceedings] = useState('');

    // Adjournment State
    const [nextDate, setNextDate] = useState('');
    const [selectedLawyerIds, setSelectedLawyerIds] = useState<string[]>([]);
    const [judge, setJudge] = useState('');
    const [pin, setPin] = useState('');
    const [isExternalCounsel, setIsExternalCounsel] = useState(false);
    const [externalCounselName, setExternalCounselName] = useState('');

    // UI State
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && workspaceId) {
            loadInitialData();
            setStep('select_brief');
            setSelectedBrief(null);
            setSearchQuery('');
            setCourtDate(new Date().toISOString().split('T')[0]);
            setProceedings('');
            setProceedings('');
            setNextDate('');
            setJudge('');
            setPin('');
            setIsExternalCounsel(false);
            setExternalCounselName('');
            setSelectedLawyerIds([userId]);
        }
    }, [isOpen, workspaceId]);

    const loadInitialData = async () => {
        setIsLoadingData(true);
        try {
            const [briefsData, lawyersData] = await Promise.all([
                getBriefs(workspaceId),
                getLawyersForWorkspace(workspaceId)
            ]);
            setBriefs(briefsData as any);
            setLawyers(lawyersData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleBriefSelect = (brief: BriefSummary) => {
        setSelectedBrief(brief);
        setCourtDate(new Date().toISOString().split('T')[0]);
        // Use lawyers from matter if available
        const assignedIds = brief.matter?.lawyers?.map(l => l.lawyer.id) || [];
        if (assignedIds.length > 0) {
            setSelectedLawyerIds(assignedIds);
        } else {
            setSelectedLawyerIds([userId]);
        }
        setStep('record_details');
    };

    const handleSubmit = async () => {
        if (!selectedBrief || !selectedBrief.matterId) return;
        if (!proceedings.trim()) {
            alert('Please describe what happened in court.');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await adjournMatter(
                selectedBrief.matterId,
                nextDate ? new Date(nextDate) : undefined,
                proceedings,
                undefined,
                userId,
                selectedLawyerIds.length > 0 ? selectedLawyerIds : [userId],
                new Date(courtDate),
                pin,
                isExternalCounsel ? externalCounselName : undefined,
                judge || undefined
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
        setStep('select_brief');
    };

    const filteredBriefs = briefs.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.briefNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.matter?.name && b.matter.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.matter?.caseNumber && b.matter.caseNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.client?.name && b.client.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal} style={{ maxWidth: '550px' }}>
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        {step === 'select_brief' ? 'Select Litigation File' : 'Record Proceeding'}
                    </h2>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    {step === 'select_brief' && (
                        <div className={styles.selectionStep}>
                            <div className={styles.searchWrapper}>
                                <Search size={18} className={styles.searchIcon} />
                                <input
                                    type="text"
                                    className={styles.searchInput}
                                    placeholder="Search by brief, matter, or client..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className={styles.matterList} style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {isLoadingData ? (
                                    <div className="py-8 flex justify-center"><Loader className="animate-spin" /></div>
                                ) : filteredBriefs.length > 0 ? (
                                    filteredBriefs.map(brief => (
                                        <div
                                            key={brief.id}
                                            className={styles.matterItem}
                                            onClick={() => handleBriefSelect(brief)}
                                        >
                                            <div className="font-medium text-slate-900">{brief.name}</div>
                                            <div className="text-xs text-slate-500 flex gap-2">
                                                <span>{brief.briefNumber}</span>
                                                {brief.matter?.caseNumber && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{brief.matter.caseNumber}</span>
                                                    </>
                                                )}
                                                {brief.client?.name && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{brief.client.name}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 text-center text-slate-500">
                                        No files found matching "{searchQuery}".
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'record_details' && selectedBrief && (
                        <div className={styles.detailsStep}>
                            {/* Context Header */}
                            <div className="bg-slate-50 p-3 rounded-lg mb-4 text-sm border border-slate-200 flex justify-between items-start">
                                <div>
                                    <div className="font-semibold text-slate-800">{selectedBrief.name}</div>
                                    <div className="text-slate-500">{selectedBrief.matter?.name || 'Litigation File'}</div>
                                    <div className="text-[10px] text-slate-400">{selectedBrief.matter?.caseNumber}</div>
                                </div>
                                <button onClick={() => setStep('select_brief')} className="text-xs text-blue-600 hover:underline">
                                    Change
                                </button>
                            </div>

                            <div className="flex gap-4 mb-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Present Date *</label>
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
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Judge / Presiding Officer</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="Name of Judge/Officer"
                                        value={judge}
                                        onChange={(e) => setJudge(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Appearing Counsel</label>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {lawyers.length > 0 ? (
                                        lawyers.map(lawyer => (
                                            <button
                                                key={lawyer.id}
                                                type="button"
                                                onClick={() => toggleLawyer(lawyer.id)}
                                                className={`${styles.lawyerButton} ${selectedLawyerIds.includes(lawyer.id) ? styles.lawyerButtonSelected : ''}`}
                                            >
                                                {lawyer.name}
                                            </button>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-slate-400 italic">Loading...</p>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setIsExternalCounsel(!isExternalCounsel)}
                                        className={`${styles.lawyerButton} ${isExternalCounsel ? styles.lawyerButtonSelected : ''}`}
                                        style={{ backgroundColor: isExternalCounsel ? '#6366f1' : undefined, color: isExternalCounsel ? 'white' : undefined }}
                                    >
                                        + External Counsel
                                    </button>
                                </div>
                                {isExternalCounsel && (
                                    <div className="mt-2">
                                        <input
                                            type="text"
                                            placeholder="Enter External Counsel Name"
                                            className={styles.input}
                                            style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
                                            value={externalCounselName}
                                            onChange={(e) => setExternalCounselName(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                )}
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

                            <div className={styles.formSection}>
                                <label className={styles.label}>Litigation Security PIN</label>
                                <input
                                    type="password"
                                    maxLength={5}
                                    placeholder="Enter 5-digit PIN"
                                    className={styles.input}
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    style={{ width: '150px', letterSpacing: '0.2rem', textAlign: 'center' }}
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Required if your firm has enabled Litigation Security.</p>
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
                    {step === 'select_brief' && (
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
        </div >
    );
};

export default RecordProceedingModal;
