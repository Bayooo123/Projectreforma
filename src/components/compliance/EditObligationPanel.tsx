'use client';

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { ComplianceTask, updateComplianceTask, createComplianceObligation } from '@/app/actions/compliance';

interface EditObligationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    task?: ComplianceTask | null; // null if adding new
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

    // Form state
    const [actionRequired, setActionRequired] = useState('');
    const [regulatoryBody, setRegulatoryBody] = useState('');
    const [nature, setNature] = useState('');
    const [frequency, setFrequency] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [status, setStatus] = useState('pending');
    const [evidenceUrl, setEvidenceUrl] = useState('');

    // Reset or populate fields when opened
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
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            />
            
            <div className="relative w-full max-w-md bg-white border-l shadow-2xl animate-fade-in flex flex-col h-full overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between border-b bg-surface-subtle">
                    <h2 className="text-lg font-semibold text-primary">
                        {task ? 'Edit Obligation' : 'Add Custom Obligation'}
                    </h2>
                    <button 
                        onClick={onClose}
                        className="p-2 -mr-2 text-slate-400 hover:bg-slate-200 hover:text-tertiary rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-start gap-3 text-sm">
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <form id="obligation-form" onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-secondary">Obligation <span className="text-red-500">*</span></label>
                            <textarea 
                                required
                                value={actionRequired}
                                onChange={e => setActionRequired(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm min-h-[80px]"
                                placeholder="e.g., Annual Data Protection Audit..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-secondary">Regulator <span className="text-red-500">*</span></label>
                                <input 
                                    type="text"
                                    required
                                    value={regulatoryBody}
                                    onChange={e => setRegulatoryBody(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                    placeholder="e.g., NDPC"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-secondary">Frequency <span className="text-red-500">*</span></label>
                                <input 
                                    type="text"
                                    required
                                    value={frequency}
                                    onChange={e => setFrequency(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                    placeholder="e.g., Annual, Monthly"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-secondary">Requirement (Nature) <span className="text-red-500">*</span></label>
                            <input 
                                type="text"
                                required
                                value={nature}
                                onChange={e => setNature(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                placeholder="e.g., Regulatory Filing, Internal Audit"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-secondary">Status <span className="text-red-500">*</span></label>
                                <select 
                                    value={status}
                                    onChange={e => setStatus(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="due_soon">Due Soon</option>
                                    <option value="overdue">Overdue</option>
                                    <option value="concluded">Concluded</option>
                                    <option value="complied">Complied</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-secondary">Due Date</label>
                                <input 
                                    type="date"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1 pt-2">
                            <label className="text-sm font-semibold text-secondary">Evidence URL</label>
                            <input 
                                type="url"
                                value={evidenceUrl}
                                onChange={e => setEvidenceUrl(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                placeholder="https://..."
                            />
                            <p className="text-xs text-secondary">Provide a link to an external document if applicable.</p>
                        </div>
                    </form>
                </div>

                <div className="px-6 py-4 border-t bg-surface-subtle flex justify-end gap-3">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-tertiary hover:text-primary transition-colors"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button 
                        form="obligation-form"
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-70"
                    >
                        {isSaving ? (
                            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={16} />
                        )}
                        {task ? 'Save Changes' : 'Create Obligation'}
                    </button>
                </div>
            </div>
        </div>
    );
}
