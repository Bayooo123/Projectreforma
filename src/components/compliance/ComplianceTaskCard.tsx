"use client";

import { useState } from 'react';
import { acknowledgeComplianceTask, markAsComplied, uploadComplianceEvidence } from '@/app/actions/compliance';
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    FileUp,
    ExternalLink,
    Info,
    Check,
    Loader2
} from 'lucide-react';

interface ComplianceTaskCardProps {
    task: any;
    onUpdate: () => void;
}

export default function ComplianceTaskCard({ task, onUpdate }: ComplianceTaskCardProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const { obligation } = task;

    const handleAcknowledge = async () => {
        setIsProcessing(true);
        const result = await acknowledgeComplianceTask(task.id);
        if (result.success) onUpdate();
        setIsProcessing(false);
    };

    const handleMarkComplied = async () => {
        setIsProcessing(true);
        const result = await markAsComplied(task.id);
        if (result.success) onUpdate();
        setIsProcessing(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;

        setIsUploading(true);
        const file = e.target.files[0];

        try {
            const response = await fetch(`/api/upload?filename=${file.name}`, {
                method: 'POST',
                body: file,
            });

            if (response.ok) {
                const blob = await response.json();
                const result = await uploadComplianceEvidence(task.id, blob.url);
                if (result.success) onUpdate();
            }
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setIsUploading(false);
            setShowEvidenceUpload(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'complied': return 'text-green-500 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800';
            case 'overdue': return 'text-red-500 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800';
            case 'due_soon': return 'text-amber-500 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800';
            default: return 'text-slate-500 bg-slate-50 dark:bg-slate-900/10 border-slate-200 dark:border-slate-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'complied': return <CheckCircle2 size={16} />;
            case 'overdue': return <AlertCircle size={16} />;
            case 'due_soon': return <Clock size={16} />;
            default: return <Clock size={16} />;
        }
    };

    return (
        <div className={`p-6 rounded-xl border bg-white dark:bg-slate-900 shadow-sm transition-all ${task.status === 'complied' ? 'opacity-80' : ''}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {obligation.regulatoryBody}
                        </span>
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getStatusColor(task.status)}`}>
                            {getStatusIcon(task.status)}
                            {task.status.replace('_', ' ')}
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{obligation.actionRequired}</h3>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="space-y-1">
                    <span className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">Frequency</span>
                    <p className="text-slate-900 dark:text-slate-200 font-medium capitalize">{obligation.frequency}</p>
                </div>
                <div className="space-y-1">
                    <span className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">Due Logic</span>
                    <p className="text-slate-900 dark:text-slate-200 font-medium">{obligation.dueDateDescription || 'Regular recurring'}</p>
                </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 mb-6">
                <div className="flex gap-2 text-sm">
                    <Info className="text-blue-500 shrink-0" size={16} />
                    <div className="space-y-2">
                        <p className="text-slate-700 dark:text-slate-300 font-medium text-xs">Procedure:</p>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">{obligation.procedure}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                {!task.acknowledgedAt && (
                    <button
                        onClick={handleAcknowledge}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                        Acknowledge
                    </button>
                )}

                {task.status !== 'complied' && (
                    <>
                        <button
                            onClick={handleMarkComplied}
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition-all disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                            Mark Complied
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setShowEvidenceUpload(!showEvidenceUpload)}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                            >
                                <FileUp size={16} />
                                Upload Evidence
                            </button>

                            {showEvidenceUpload && (
                                <div className="absolute bottom-full mb-2 left-0 w-64 bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-3 text-center">Select Evidence File</p>
                                    <input
                                        type="file"
                                        onChange={handleFileUpload}
                                        disabled={isUploading}
                                        className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-400"
                                    />
                                    {isUploading && (
                                        <div className="mt-2 text-center text-[10px] text-blue-500 font-bold animate-pulse">
                                            UPLOADING...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {task.evidenceUrl && (
                    <a
                        href={task.evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                        <ExternalLink size={16} />
                        View Evidence
                    </a>
                )}
            </div>

            {task.acknowledgedAt && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                        <Check className="text-green-500" size={12} />
                        Acknowledged by {task.user?.name || task.user?.email || 'System'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                        {new Date(task.acknowledgedAt).toLocaleDateString()}
                    </div>
                </div>
            )}
        </div>
    );
}
