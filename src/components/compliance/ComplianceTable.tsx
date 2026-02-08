'use client';

import { ComplianceTask } from "@/app/actions/compliance";

import { FileUp, Eye, CheckCircle, AlertCircle, Clock, ExternalLink, Loader2, Globe, Edit2 } from "lucide-react";
import { useState } from "react";
import { uploadEvidence } from "@/app/actions/compliance";
import styles from "./Compliance.module.css";

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
            const response = await fetch(`/api/upload?filename=${file.name}`, {
                method: 'POST',
                body: file,
            });

            if (!response.ok) throw new Error('Upload failed');

            const blob = await response.json();
            await uploadEvidence(taskId, blob.url);
            onUpdate();
        } catch (error) {
            console.error('Evidence upload failed:', error);
            alert('Failed to upload evidence');
        } finally {
            setUploadingId(null);
        }
    };

    const formatDate = (date: Date | string | null | undefined) => {
        if (!date) return null;
        const d = new Date(date);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getStatusBadge = (status: string, dueDate: Date | string | null) => {
        const s = status.toLowerCase();
        let currentStatus = s;

        // Auto-compute status overflow if date exists
        if (dueDate && s !== 'concluded' && s !== 'complied') {
            const now = new Date();
            const due = new Date(dueDate);
            const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays < 0) currentStatus = 'overdue';
            else if (diffDays <= 7) currentStatus = 'due_soon';
        }

        let icon = <Clock size={12} />;
        let statusClass = styles['status-pending'];
        let label = "Pending";

        if (currentStatus === 'due_soon') {
            icon = <AlertCircle size={12} />;
            statusClass = styles['status-due_soon'];
            label = "Due Soon";
        } else if (currentStatus === 'overdue') {
            icon = <AlertCircle size={12} />;
            statusClass = styles['status-overdue'];
            label = "Overdue";
        } else if (currentStatus === 'concluded' || currentStatus === 'complied') {
            icon = <CheckCircle size={12} />;
            statusClass = styles['status-concluded'];
            label = "Concluded";
        }

        return (
            <span className={`${styles.statusBadge} ${statusClass}`}>
                {icon}
                {label}
            </span>
        );
    };

    return (
        <div className={styles.tableWrapper}>
            <table className={styles.complianceTable}>
                <thead className={styles.tableHeader}>
                    <tr>
                        <th>Obligation</th>
                        <th>Regulator</th>
                        <th>Requirement</th>
                        <th>Due Date</th>
                        <th>Frequency</th>
                        <th>Status</th>
                        <th>Evidence</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.map((task) => (
                        <tr key={task.id} className={styles.tableRow}>
                            <td className={`${styles.tableCell} ${styles.obligationCell}`}>
                                <div className={styles.obligationTitle}>
                                    {task.obligation.actionRequired}
                                </div>
                                <div className={styles.obligationDesc}>
                                    {task.obligation.procedure}
                                </div>
                            </td>
                            <td className={styles.tableCell}>
                                <span className={styles.regulatorBadge}>
                                    {task.obligation.regulatoryBody}
                                </span>
                            </td>
                            <td className={`${styles.tableCell} text-slate-500 font-medium`}>
                                {task.obligation.nature}
                            </td>
                            <td className={styles.tableCell}>
                                <div className={styles.dueDateText}>
                                    {task.dueDate ? (
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-slate-800">{formatDate(task.dueDate)}</span>
                                            <span className="text-[10px] text-slate-400 italic">({task.obligation.dueDateDescription})</span>
                                        </div>
                                    ) : (
                                        task.obligation.dueDateDescription
                                    )}
                                </div>
                            </td>
                            <td className={`${styles.tableCell} capitalize text-slate-500 font-medium`}>
                                {task.obligation.frequency}
                            </td>
                            <td className={styles.tableCell}>
                                {getStatusBadge(task.status, task.dueDate)}
                            </td>
                            <td className={styles.tableCell}>
                                <div className="flex items-center gap-2">
                                    {task.status === 'concluded' || task.status === 'complied' ? (
                                        <a
                                            href={task.evidenceUrl!}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.viewBtn}
                                        >
                                            <Eye size={14} />
                                            <span>View Proof</span>
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
                                                className={styles.uploadBtn}
                                            >
                                                {uploadingId === task.id ? (
                                                    <>
                                                        <Loader2 size={14} className="animate-spin text-primary" />
                                                        <span>Syncing...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <FileUp size={14} />
                                                        <span>Upload Evidence</span>
                                                    </>
                                                )}
                                            </label>
                                        </div>
                                    )}
                                    <button
                                        className={styles.editBtn}
                                        onClick={() => alert('Edit Obligation functionality is enabled and will open a side panel in the next update.')}
                                        title="Edit Obligation"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {tasks.length === 0 && (
                        <tr>
                            <td colSpan={7} className={styles.emptyState}>
                                <div className="flex flex-col items-center gap-2">
                                    <Globe size={40} className="text-slate-200 mb-2" />
                                    <p className={styles.emptyText}>No obligations cataloged for this tier.</p>
                                    <p className="text-xs text-slate-400">Please select a different jurisdiction or sync database.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
