'use client';

import { ComplianceTask } from "@/app/actions/compliance";
import { Badge } from "@/components/ui/badge"; // Assuming we have or will use standard badges, or I'll style them manually if needed
import { FileUp, Eye, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useState } from "react";
import { uploadEvidence } from "@/app/actions/compliance";

interface ComplianceTableProps {
    tasks: ComplianceTask[];
    onUpdate: () => void;
}

export default function ComplianceTable({ tasks, onUpdate }: ComplianceTableProps) {
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    const handleFileUpload = async (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;

        setUploadingId(taskId);
        const file = e.target.files[0];

        try {
            // 1. Upload to blob storage (reusing existing API pattern)
            const response = await fetch(`/api/upload?filename=${file.name}`, {
                method: 'POST',
                body: file,
            });

            if (!response.ok) throw new Error('Upload failed');

            const blob = await response.json();

            // 2. Update task status via server action
            await uploadEvidence(taskId, blob.url);

            // 3. Refresh
            onUpdate();
        } catch (error) {
            console.error('Evidence upload failed:', error);
            alert('Failed to upload evidence');
        } finally {
            setUploadingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
            due_soon: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
            overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            concluded: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        };

        const labels = {
            pending: "Pending",
            due_soon: "Due Soon",
            overdue: "Overdue",
            concluded: "Concluded",
            complied: "Concluded" // Handle legacy
        };

        const s = status.toLowerCase() as keyof typeof styles;
        const style = styles[s] || styles.pending;
        const label = labels[s] || status;

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>
                {label}
            </span>
        );
    };

    return (
        <div className="border rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700">
                    <tr>
                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Obligation</th>
                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Regulator</th>
                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Requirement</th>
                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Due Date</th>
                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Frequency</th>
                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Status</th>
                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Evidence</th>
                    </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800">
                    {tasks.map((task) => (
                        <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="font-medium text-slate-900 dark:text-white">
                                    {task.obligation.actionRequired}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5 max-w-[240px]">
                                    {task.obligation.procedure}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                {task.obligation.regulatoryBody}
                            </td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                {task.obligation.nature}
                            </td>
                            <td className="px-6 py-4">
                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                    {task.obligation.dueDateDescription}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 capitalize">
                                {task.obligation.frequency}
                            </td>
                            <td className="px-6 py-4">
                                {getStatusBadge(task.status)}
                            </td>
                            <td className="px-6 py-4">
                                {task.status === 'concluded' || task.status === 'complied' ? (
                                    <a
                                        href={task.evidenceUrl!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium text-xs"
                                    >
                                        <Eye size={14} />
                                        View
                                    </a>
                                ) : (
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id={`upload-${task.id}`}
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(task.id, e)}
                                            disabled={uploadingId === task.id}
                                        />
                                        <label
                                            htmlFor={`upload-${task.id}`}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer border transition-all ${uploadingId === task.id
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                                                }`}
                                        >
                                            {uploadingId === task.id ? (
                                                'Uploading...'
                                            ) : (
                                                <>
                                                    <FileUp size={14} />
                                                    Upload
                                                </>
                                            )}
                                        </label>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                    {tasks.length === 0 && (
                        <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                No obligations found for this tier.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
