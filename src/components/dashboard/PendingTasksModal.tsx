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
            case 'in_progress':
                return 'bg-amber-100 text-amber-800';
            case 'completed':
                return 'bg-emerald-100 text-emerald-800';
            case 'review':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-slate-100 text-slate-800';
        }
    };

    const formatStatus = (status: string) => {
        return status.replace('_', ' ');
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-[90%] max-w-[700px] max-h-[80vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-semibold text-slate-800">Pending Tasks</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-800 transition-colors p-1 rounded-full hover:bg-slate-100"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 md:p-8">
                    {tasks.length === 0 ? (
                        <div className="text-center py-12 px-4 text-slate-500">
                            <p>No pending tasks found.</p>
                        </div>
                    ) : (
                        tasks.map((task) => (
                            <div key={task.id} className="p-5 border border-slate-200 rounded-xl mb-3 hover:border-[#0f5f5a] hover:bg-[#f8fffe] transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-semibold text-slate-800 text-[15px] group-hover:text-[#0f5f5a] transition-colors">
                                        {task.title}
                                    </div>
                                    <div className={cn(
                                        "px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider",
                                        getStatusStyle(task.status)
                                    )}>
                                        {formatStatus(task.status)}
                                    </div>
                                </div>
                                <div className="text-[13px] text-slate-500 font-medium">
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
