'use client';

import { ComplianceTask } from "@/app/actions/compliance";

import { CheckCircle, AlertCircle, Clock, ExternalLink, Globe, Edit2, Link2 } from "lucide-react";
import styles from "./Compliance.module.css";

interface ComplianceTableProps {
    tasks: ComplianceTask[];
    onUpdate: () => void;
    onEdit?: (task: ComplianceTask) => void;
}

export default function ComplianceTable({ tasks, onUpdate, onEdit }: ComplianceTableProps) {

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
                        <th>Comply</th>
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
                                {task.obligation.feeDescription && (
                                    <div className={styles.feeDescription}>
                                        <span className={styles.feeLabel}>Fee: </span>
                                        {task.obligation.feeDescription}
                                    </div>
                                )}
                            </td>
                            <td className={styles.tableCell}>
                                <span className={styles.regulatorBadge}>
                                    {task.obligation.regulatoryBody}
                                </span>
                            </td>
                            <td className={`${styles.tableCell} text-secondary font-medium`}>
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
                            <td className={`${styles.tableCell} capitalize text-secondary font-medium`}>
                                {task.obligation.frequency}
                            </td>
                            <td className={styles.tableCell}>
                                {getStatusBadge(task.status, task.dueDate)}
                            </td>
                            <td className={styles.tableCell}>
                                <div className="flex items-center gap-2">
                                    {task.evidenceUrl ? (
                                        <a
                                            href={task.evidenceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.viewBtn}
                                        >
                                            <ExternalLink size={14} />
                                            <span>Comply →</span>
                                        </a>
                                    ) : (
                                        <button
                                            className={styles.uploadBtn}
                                            onClick={() => onEdit && onEdit(task)}
                                            title="Add compliance link"
                                        >
                                            <Link2 size={14} />
                                            <span>Add link</span>
                                        </button>
                                    )}
                                    <button
                                        className={styles.editBtn}
                                        onClick={() => onEdit && onEdit(task)}
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
