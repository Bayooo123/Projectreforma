'use client';

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Upload, Loader2, FileText, Globe, CheckCircle2 } from 'lucide-react';
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
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
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

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) await uploadFile(file);
    };

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) await uploadFile(file);
    };

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        setError(null);
        try {
            const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
                method: 'POST',
                body: file,
            });
            if (!res.ok) throw new Error('Upload failed');
            const blob = await res.json();
            setEvidenceUrl(blob.url);
        } catch (err: any) {
            setError('Evidence upload failed: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

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
            
            <div className="relative w-full max-w-lg bg-white shadow-[0_0_50px_rgba(0,0,0,0.3)] animate-in slide-in-from-right duration-300 flex flex-col h-full overflow-hidden border-l border-slate-200">
                <div className="px-8 py-6 flex items-center justify-between border-b bg-slate-50/50 backdrop-blur-xl sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
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

                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
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
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm min-h-[100px] transition-all bg-slate-50/30 font-medium leading-relaxed"
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
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm bg-slate-50/30 transition-all font-medium"
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
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm bg-slate-50/30 transition-all font-medium"
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
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm bg-slate-50/30 transition-all font-medium"
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
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm bg-slate-50/30 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Ingest Evidence</label>
                                
                                <div className="space-y-4">
                                    {evidenceUrl && (
                                        <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl animate-in zoom-in-95">
                                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-600 border border-emerald-100 shrink-0">
                                                {evidenceUrl.includes('http') ? <Globe size={20} /> : <FileText size={20} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Active Linkage</p>
                                                <a href={evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block mt-0.5 font-medium">
                                                    {evidenceUrl}
                                                </a>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => setEvidenceUrl('')}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )}

                                    <div 
                                        className={`relative group h-32 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-6 text-center ${
                                            dragActive 
                                            ? 'border-blue-500 bg-blue-50 shadow-inner' 
                                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                                        }`}
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                    >
                                        <input 
                                            type="file" 
                                            onChange={handleFileInput}
                                            disabled={isUploading}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                                        />
                                        {isUploading ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 size={32} className="animate-spin text-blue-500" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Syncing with Cloud...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                    <Upload size={20} className="text-slate-400" />
                                                </div>
                                                <p className="text-xs font-bold text-slate-900 leading-tight">Drop proof here</p>
                                                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">PDF, JPEG, or DOCX</p>
                                            </>
                                        )}
                                    </div>

                                    <div className="relative flex items-center gap-4 py-2">
                                        <div className="h-px flex-1 bg-slate-100" />
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">or link external</span>
                                        <div className="h-px flex-1 bg-slate-100" />
                                    </div>

                                    <input 
                                        type="url"
                                        value={evidenceUrl}
                                        onChange={e => setEvidenceUrl(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm bg-slate-50/30 transition-all font-medium"
                                        placeholder="Paste Dropbox, Google Drive, or Cloud Link..."
                                    />
                                </div>
                            </div>
                        </fieldset>
                    </form>
                </div>

                <div className="px-8 py-6 border-t bg-slate-50/50 backdrop-blur-xl flex items-center justify-between sticky bottom-0 z-10">
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
