'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2, Globe, CheckCircle2, Link2 } from 'lucide-react';
import { ComplianceTask, updateComplianceTask, createComplianceObligation } from '@/app/actions/compliance';

interface EditObligationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    task?: ComplianceTask | null;
    workspaceId: string;
    tier: string;
    onSaved: () => void;
}

export default function EditObligationPanel({
    isOpen,
    onClose,
    task,
    workspaceId,
    tier,
    onSaved
}: EditObligationPanelProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [actionRequired, setActionRequired] = useState('');
    const [regulatoryBody, setRegulatoryBody] = useState('');
    const [nature, setNature] = useState('');
    const [frequency, setFrequency] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [status, setStatus] = useState('pending');
    const [evidenceUrl, setEvidenceUrl] = useState('');

    useEffect(() => {
        if (isOpen) {
            setError(null);
            if (task) {
                setActionRequired(task.obligation.actionRequired);
                setRegulatoryBody(task.obligation.regulatoryBody);
                setNature(task.obligation.nature);
                setFrequency(task.obligation.frequency);
                setStatus(task.status);
                setEvidenceUrl(task.evidenceUrl || '');
                setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
            } else {
                setActionRequired('');
                setRegulatoryBody('');
                setNature('');
                setFrequency('Annual');
                setStatus('pending');
                setEvidenceUrl('');
                setDueDate('');
            }
        }
    }, [isOpen, task]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        const formData = new FormData();
        formData.append('actionRequired', actionRequired);
        formData.append('regulatoryBody', regulatoryBody);
        formData.append('nature', nature);
        formData.append('frequency', frequency);
        if (dueDate) formData.append('dueDate', new Date(dueDate).toISOString());
        formData.append('status', status);
        if (evidenceUrl) formData.append('evidenceUrl', evidenceUrl);

        try {
            let result;
            if (task) {
                formData.append('taskId', task.id);
                result = await updateComplianceTask(formData);
            } else {
                result = await createComplianceObligation(workspaceId, tier, formData);
            }

            if (result.success) {
                onSaved();
                onClose();
            } else {
                setError(result.error);
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div 
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-all duration-500 animate-in fade-in" 
                onClick={onClose}
            />
            
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 shadow-[0_0_50px_rgba(0,0,0,0.3)] animate-in slide-in-from-right duration-300 flex flex-col h-full overflow-hidden border-l border-slate-200 dark:border-slate-700">
                <div className="px-8 py-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {task ? 'Edit Obligation' : 'Add Custom Compliance'}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {tier} Tier • Workspace Ingestion
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 -mr-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-full transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 bg-white dark:bg-slate-900">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl flex items-start gap-4 text-xs font-medium animate-in slide-in-from-top-2">
                            <AlertCircle size={20} className="shrink-0 text-red-500" />
                            <p className="leading-relaxed">{error}</p>
                        </div>
                    )}

                    <form id="obligation-form" onSubmit={handleSubmit} className="space-y-10">
                        {/* Section 1: Requirement Schema */}
                        <fieldset className="p-0 m-0 border-none space-y-6">
                            <legend className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">
                                Requirement Schema
                            </legend>
                            
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Explicit Action <span className="text-blue-500">*</span></label>
                                <textarea 
                                    required
                                    value={actionRequired}
                                    onChange={e => setActionRequired(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm min-h-[100px] transition-all bg-white dark:bg-slate-800 font-medium leading-relaxed"
                                    placeholder="e.g. Conduct independent ISO 27001 data audit..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Regulator <span className="text-blue-500">*</span></label>
                                    <input 
                                        type="text"
                                        required
                                        value={regulatoryBody}
                                        onChange={e => setRegulatoryBody(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm bg-white dark:bg-slate-800 transition-all font-medium"
                                        placeholder="e.g. NDPC / NITDA"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Interval <span className="text-blue-500">*</span></label>
                                    <input 
                                        type="text"
                                        required
                                        value={frequency}
                                        onChange={e => setFrequency(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm bg-white dark:bg-slate-800 transition-all font-medium"
                                        placeholder="e.g. Annual / Bi-Annual"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Core Requirement <span className="text-blue-500">*</span></label>
                                <input 
                                    type="text"
                                    required
                                    value={nature}
                                    onChange={e => setNature(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm bg-white dark:bg-slate-800 transition-all font-medium"
                                    placeholder="e.g. Regulatory Compliance Filing"
                                />
                            </div>
                        </fieldset>

                        {/* Section 2: Fulfillment Status */}
                        <fieldset className="p-0 m-0 border-none space-y-6">
                            <legend className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">
                                Fulfillment Status
                            </legend>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Current Status <span className="text-blue-500">*</span></label>
                                    <select 
                                        value={status}
                                        onChange={e => setStatus(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm bg-white transition-all font-bold text-slate-900"
                                    >
                                        <option value="pending">PENDING</option>
                                        <option value="due_soon">DUE SOON</option>
                                        <option value="overdue">OVERDUE</option>
                                        <option value="concluded">CONCLUDED</option>
                                        <option value="complied">COMPLIED</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Deadline</label>
                                    <input 
                                        type="date"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm bg-white dark:bg-slate-800 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 block">
                                    <Link2 size={12} /> Compliance Link
                                </label>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    Paste the URL where this obligation is registered or paid (e.g. NBA portal, FIRS website, CAC portal).
                                </p>
                                {evidenceUrl && (
                                    <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                                        <Globe size={14} className="text-emerald-600 shrink-0" />
                                        <a href={evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-700 hover:underline truncate flex-1 font-medium">
                                            {evidenceUrl}
                                        </a>
                                        <button type="button" onClick={() => setEvidenceUrl('')} className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors">
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                                <input
                                    type="url"
                                    value={evidenceUrl}
                                    onChange={e => setEvidenceUrl(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-500 text-sm bg-white transition-all font-medium text-slate-900 placeholder:text-slate-400"
                                    placeholder="https://portal.nba.org.ng/practising-fee"
                                />
                            </div>
                        </fieldset>
                    </form>
                </div>

                <div className="px-8 py-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between sticky bottom-0 z-10">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="text-xs font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors"
                        disabled={isSaving}
                    >
                        Dismiss
                    </button>
                    <button 
                        form="obligation-form"
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-3 px-8 py-3 bg-slate-900 hover:bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                    >
                        {isSaving ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <CheckCircle2 size={16} />
                        )}
                        {task ? 'Update Record' : 'Create Record'}
                    </button>
                </div>
            </div>
        </div>
    );
}
