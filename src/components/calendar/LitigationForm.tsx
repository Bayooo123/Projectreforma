"use client";

import { useState, useEffect } from 'react';
import { X, Gavel, Loader, Search, Calendar, MapPin, User, FileText } from 'lucide-react';
import { createMatter, adjournMatter } from '@/app/actions/matters';
import { getClientsForWorkspace, getLawyersForWorkspace, getBriefs } from '@/lib/briefs';
import styles from './LitigationForm.module.css';

interface LitigationFormProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'create' | 'update';
    workspaceId: string;
    userId: string;
    onSuccess?: () => void;
    initialMatter?: any;
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
    const [step, setStep] = useState<'select' | 'form'>(initialMatter ? 'form' : (mode === 'update' ? 'select' : 'form'));
    
    // Data List State
    const [clients, setClients] = useState<any[]>([]);
    const [lawyers, setLawyers] = useState<any[]>([]);
    const [matters, setMatters] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Form Selection State
    const [selectedMatter, setSelectedMatter] = useState<any>(initialMatter || null);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [clientSearch, setClientSearch] = useState('');
    const [matterSearch, setMatterSearch] = useState('');
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

    // Core Fields
    const [matterName, setMatterName] = useState('');
    const [court, setCourt] = useState('');
    const [judge, setJudge] = useState('');
    const [proceedingDate, setProceedingDate] = useState(new Date().toISOString().split('T')[0]);
    const [courtSummary, setCourtSummary] = useState('');
    const [nextCourtDate, setNextCourtDate] = useState('');
    const [adjournedFor, setAdjournedFor] = useState('');
    const [selectedLawyerIds, setSelectedLawyerIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && workspaceId) {
            loadData();
            if (initialMatter) {
                handleSelectMatter(initialMatter);
            }
        }
    }, [isOpen, workspaceId, initialMatter]);

    const loadData = async () => {
        setIsLoadingData(true);
        try {
            const [lawyersData, clientsData, briefsData] = await Promise.all([
                getLawyersForWorkspace(workspaceId),
                getClientsForWorkspace(workspaceId),
                getBriefs(workspaceId)
            ]);
            setLawyers(lawyersData);
            setClients(clientsData);
            if (mode === 'update') {
                setMatters(briefsData.filter(b => b.matter).map(b => b.matter));
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleSelectMatter = (matter: any) => {
        setSelectedMatter(matter);
        setMatterName(matter.name);
        setCourt(matter.court || '');
        setJudge(matter.judge || '');
        setSelectedLawyerIds(matter.lawyers?.map((l: any) => l.lawyerId) || [userId]);
        setStep('form');
    };

    const handleSelectClient = (client: any) => {
        setSelectedClient(client);
        setClientSearch(client.name);
        setIsClientDropdownOpen(false);
    };

    const toggleLawyer = (lawyerId: string) => {
        setSelectedLawyerIds(prev => prev.includes(lawyerId) ? prev.filter(id => id !== lawyerId) : [...prev, lawyerId]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (mode === 'create') {
                await createMatter({
                    name: matterName,
                    workspaceId,
                    court,
                    judge,
                    nextCourtDate: nextCourtDate ? new Date(nextCourtDate) : undefined,
                    proceedingDate: new Date(proceedingDate),
                    proceedings: courtSummary,
                    clientId: selectedClient?.id || null,
                    clientName: selectedClient ? null : clientSearch,
                    lawyerAssociations: selectedLawyerIds.map(id => ({ lawyerId: id, role: 'appearing', isAppearing: true })),
                    createdById: userId
                });
            } else {
                await adjournMatter(
                    selectedMatter.id,
                    nextCourtDate ? new Date(nextCourtDate) : undefined,
                    courtSummary,
                    adjournedFor,
                    userId,
                    selectedLawyerIds,
                    new Date(proceedingDate),
                    undefined, // pin skipped for brevity/speed unless strict
                    undefined,
                    judge
                );
            }
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Submission error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{mode === 'create' ? 'Assign New Matter' : 'Record Proceeding'}</h2>
                    <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
                </div>

                <div className={styles.content}>
                    {step === 'select' ? (
                        <div className={styles.selectionGrid}>
                            <div className="relative mb-4">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    className={styles.input} 
                                    style={{ paddingLeft: '2.5rem' }} 
                                    placeholder="Search matters..." 
                                    value={matterSearch}
                                    onChange={e => setMatterSearch(e.target.value)}
                                />
                            </div>
                            <div className={styles.matterList}>
                                {matters.filter(m => m.name.toLowerCase().includes(matterSearch.toLowerCase())).map(m => (
                                    <div key={m.id} className={styles.matterItem} onClick={() => handleSelectMatter(m)}>
                                        <strong>{m.name}</strong>
                                        <span>{m.caseNumber || 'No case number'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <form className={styles.form} onSubmit={handleSubmit}>
                            {mode === 'create' && (
                                <>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Client Name *</label>
                                        <div className="relative">
                                            <input 
                                                className={styles.input} 
                                                value={clientSearch} 
                                                onChange={e => { setClientSearch(e.target.value); setIsClientDropdownOpen(true); }}
                                                placeholder="Type client name..."
                                            />
                                            {isClientDropdownOpen && (
                                                <div className={styles.dropdown}>
                                                    {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                                                        <div key={c.id} className={styles.dropdownItem} onClick={() => handleSelectClient(c)}>{c.name}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Matter Name *</label>
                                        <input className={styles.input} value={matterName} onChange={e => setMatterName(e.target.value)} placeholder="e.g. State v. John" required />
                                    </div>
                                </>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Court</label>
                                    <input className={styles.input} value={court} onChange={e => setCourt(e.target.value)} placeholder="e.g. Federal High Court" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Judge</label>
                                    <input className={styles.input} value={judge} onChange={e => setJudge(e.target.value)} placeholder="e.g. Justice Cole" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Activity Date *</label>
                                    <input type="date" className={styles.input} value={proceedingDate} onChange={e => setProceedingDate(e.target.value)} required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Adjourned To</label>
                                    <input type="date" className={styles.input} value={nextCourtDate} onChange={e => setNextCourtDate(e.target.value)} />
                                </div>
                            </div>

                            {nextCourtDate && (
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Adjourned For</label>
                                    <input className={styles.input} value={adjournedFor} onChange={e => setAdjournedFor(e.target.value)} placeholder="e.g. Continuation of Hearing" />
                                </div>
                            )}

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Appearing Counsel</label>
                                <div className={styles.lawyerSelector}>
                                    {lawyers.map(l => (
                                        <button 
                                            key={l.id} 
                                            type="button" 
                                            className={`${styles.lawyerBadge} ${selectedLawyerIds.includes(l.id) ? styles.activeBadge : ''}`}
                                            onClick={() => toggleLawyer(l.id)}
                                        >
                                            {l.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Summary of Proceedings</label>
                                <textarea className={styles.textarea} value={courtSummary} onChange={e => setCourtSummary(e.target.value)} placeholder="What happened today?" />
                            </div>
                        </form>
                    )}
                </div>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                    {step === 'form' && (
                        <button className={styles.submitBtn} onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <Loader className="animate-spin" size={18} /> : mode === 'create' ? 'Create Matter' : 'Record Proceeding'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LitigationForm;

export default LitigationForm;
