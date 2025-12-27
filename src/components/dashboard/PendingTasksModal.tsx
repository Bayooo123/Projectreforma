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
                return 'bg-[#fef3c7] text-[#92400e]'; // status-pending
            case 'completed':
                return 'bg-[#d1fae5] text-[#065f46]'; // status-completed
            case 'reserved':
            case 'review':
                return 'bg-[#dbeafe] text-[#1e40af]'; // status-reserved
            case 'in_progress':
                return 'bg-[#dbeafe] text-[#1e40af]'; // map to reserved or similar
            default:
                return 'bg-slate-100 text-slate-800';
        }
    };

    const formatStatus = (status: string) => {
        return status.replace('_', ' ');
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white rounded-[16px] w-[90%] max-w-[700px] max-h-[80vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-200">
                <div className="p-[32px] border-b border-[#e2e8f0] flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-[20px] font-semibold text-[#1a202c]">Pending Tasks</h2>
                    <button
                        onClick={onClose}
                        className="text-[#718096] hover:text-[#1a202c] transition-colors text-[24px] leading-none"
                    >
                        ×
                    </button>
                </div>

                <div className="p-[32px]">
                    {tasks.length === 0 ? (
                        <div className="text-center py-12 px-4 text-slate-500">
                            <p>No pending tasks found.</p>
                        </div>
                    ) : (
                        tasks.map((task) => (
                            <div key={task.id} className="p-[20px] border border-[#e2e8f0] rounded-[10px] mb-[12px] hover:border-[#0f5f5a] hover:bg-[#f8fffe] transition-all group">
                                <div className="flex justify-between items-start mb-[8px]">
                                    <div className="font-semibold text-[#1a202c] text-[15px]">
                                        {task.title}
                                    </div>
                                    <div className={cn(
                                        "px-[12px] py-[4px] rounded-[20px] text-[11px] font-semibold uppercase tracking-[0.5px]",
                                        getStatusStyle(task.status)
                                    )}>
                                        {formatStatus(task.status)}
                                    </div>
                                </div>
                                <div className="text-[13px] text-[#718096]">
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
