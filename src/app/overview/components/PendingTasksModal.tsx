'use client';

import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, CheckCircle, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { getPendingTasks } from "@/app/actions/dashboard";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface PendingTask {
    id: string;
    title: string;
    dueDate: Date | null;
    status: string;
    priority: string;
}

interface PendingTasksModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PendingTasksModal({ isOpen, onClose }: PendingTasksModalProps) {
    const [tasks, setTasks] = useState<PendingTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            getPendingTasks(20).then(data => {
                setTasks(data);
                setIsLoading(false);
            });
        }
    }, [isOpen]);

    // Close on ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl pointer-events-auto flex flex-col max-h-[85vh]"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Pending Tasks</h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        You have {tasks.length} tasks requiring attention.
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-6 scrollbar-width-thin">
                                {isLoading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                                        ))}
                                    </div>
                                ) : tasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="rounded-full bg-green-100 p-4 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                            <CheckCircle size={32} />
                                        </div>
                                        <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">All caught up!</h3>
                                        <p className="text-slate-500 max-w-xs mx-auto mt-2">
                                            You have no pending tasks. Enjoy your focus time.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {tasks.map(task => (
                                            <div
                                                key={task.id}
                                                className="group flex items-start gap-4 rounded-lg border border-slate-100 p-4 hover:border-teal-200 hover:bg-teal-50/30 dark:border-slate-800 dark:hover:bg-slate-800/50 transition-colors"
                                            >
                                                <div className="mt-0.5 rounded-full border-2 border-slate-300 p-0.5 text-transparent group-hover:border-teal-500 group-hover:text-teal-500 transition-colors cursor-pointer">
                                                    <CheckCircle size={14} className="opacity-0 group-hover:opacity-100" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-slate-900 dark:text-slate-100">{task.title}</h4>
                                                    <div className="mt-2 flex items-center gap-3">
                                                        {task.dueDate && (
                                                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                                                                <Calendar size={12} />
                                                                {new Date(task.dueDate).toLocaleDateString()}
                                                            </div>
                                                        )}
                                                        <Badge variant={getPriorityBadgeVariant(task.priority)}>
                                                            {task.priority}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl flex justify-end">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:shadow-sm rounded-md transition-all dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}

function getPriorityBadgeVariant(priority: string): "default" | "secondary" | "destructive" | "outline" {
    switch (priority) {
        case 'urgent': return 'destructive';
        case 'high': return 'default'; // Map high to primary color
        default: return 'secondary';
    }
}
