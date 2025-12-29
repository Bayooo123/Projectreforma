'use client';

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { getPendingTasks } from "@/app/actions/dashboard";

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
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center"
                    />

                    {/* Modal Content */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="w-[90%] max-w-[700px] max-h-[80vh] bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] pointer-events-auto flex flex-col overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-8 border-b border-slate-200 dark:border-slate-800 shrink-0">
                                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Pending Tasks</h2>
                                <button
                                    onClick={onClose}
                                    className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="overflow-y-auto p-8 flex flex-col gap-3">
                                {isLoading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                                        ))}
                                    </div>
                                ) : tasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                                        All caught up!
                                    </div>
                                ) : (
                                    tasks.map(task => (
                                        <div
                                            key={task.id}
                                            className="p-5 border border-slate-200 dark:border-slate-700 rounded-[10px] transition-all duration-200 hover:border-[#0f5f5a] hover:bg-[#f8fffe] dark:hover:border-teal-500 dark:hover:bg-teal-900/10"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-semibold text-[15px] text-slate-900 dark:text-white pr-4">
                                                    {task.title}
                                                </div>
                                                <div className={`px-3 py-1 rounded-[20px] text-[11px] font-semibold uppercase tracking-[0.5px] ${getStatusClasses(task.status, task.priority)}`}>
                                                    {task.status === 'pending' ? 'Pending' : task.status}
                                                </div>
                                            </div>
                                            <div className="text-[13px] text-slate-500 dark:text-slate-400">
                                                Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long' }) : 'No Date'} • Assigned from Brief Manager
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}

function getStatusClasses(status: string, priority: string): string {
    if (status === 'completed') return 'bg-[#d1fae5] text-[#065f46]'; // green
    if (priority === 'urgent') return 'bg-red-100 text-red-800';
    return 'bg-[#fef3c7] text-[#92400e]'; // amber
}
