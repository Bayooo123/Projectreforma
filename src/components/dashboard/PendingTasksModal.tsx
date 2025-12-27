import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface Task {
    id: string;
    title: string;
    status: string;
    dueDate: Date | null;
    assignedBy: {
        name: string | null;
    } | null;
}

interface PendingTasksModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
}

export function PendingTasksModal({ isOpen, onClose, tasks }: PendingTasksModalProps) {
    if (!isOpen) return null;

    const formatDate = (date: Date | null) => {
        if (!date) return 'No due date';
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'long'
        }).format(new Date(date));
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-[#fef3c7] text-[#92400e] dark:bg-amber-900/50 dark:text-amber-200'; // status-pending
            case 'completed':
                return 'bg-[#d1fae5] text-[#065f46] dark:bg-emerald-900/50 dark:text-emerald-200'; // status-completed
            case 'reserved':
            case 'review':
                return 'bg-[#dbeafe] text-[#1e40af] dark:bg-blue-900/50 dark:text-blue-200'; // status-reserved
            case 'in_progress':
                return 'bg-[#dbeafe] text-[#1e40af] dark:bg-blue-900/50 dark:text-blue-200'; // map to reserved or similar
            default:
                return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        }
    };

    const formatStatus = (status: string) => {
        return status.replace('_', ' ');
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-[16px] w-[90%] max-w-[700px] max-h-[80vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.7)] animate-in zoom-in-95 duration-200 ring-1 ring-slate-200 dark:ring-slate-700">
                <div className="p-[32px] border-b border-[#e2e8f0] dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10">
                    <h2 className="text-[20px] font-semibold text-[#1a202c] dark:text-slate-100">Pending Tasks</h2>
                    <button
                        onClick={onClose}
                        className="text-[#718096] dark:text-slate-400 hover:text-[#1a202c] dark:hover:text-white transition-colors text-[24px] leading-none"
                    >
                        ×
                    </button>
                </div>

                <div className="p-[32px]">
                    {tasks.length === 0 ? (
                        <div className="text-center py-12 px-4 text-slate-500 dark:text-slate-400">
                            <p>No pending tasks found.</p>
                        </div>
                    ) : (
                        tasks.map((task) => (
                            <div key={task.id} className="p-[20px] border border-[#e2e8f0] dark:border-slate-700 rounded-[10px] mb-[12px] hover:border-[#0f5f5a] dark:hover:border-teal-400 hover:bg-[#f8fffe] dark:hover:bg-slate-700/30 transition-all group">
                                <div className="flex justify-between items-start mb-[8px]">
                                    <div className="font-semibold text-[#1a202c] dark:text-slate-200 text-[15px]">
                                        {task.title}
                                    </div>
                                    <div className={cn(
                                        "px-[12px] py-[4px] rounded-[20px] text-[11px] font-semibold uppercase tracking-[0.5px]",
                                        getStatusStyle(task.status)
                                    )}>
                                        {formatStatus(task.status)}
                                    </div>
                                </div>
                                <div className="text-[13px] text-[#718096] dark:text-slate-400">
                                    Due: {formatDate(task.dueDate)} • Assigned by {task.assignedBy?.name || 'System'}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
