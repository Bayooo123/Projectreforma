import { useState } from 'react';
import { Send, User, Calendar, Plus, Paperclip, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const STAFF = ['Kemi Adeniran', 'Adebayo Ogundimu', 'Bola Okafor', 'Chinedu Okeke'];

interface TaskAssignmentWidgetProps {
    initialTasks?: any[];
    users?: any[];
    currentUserId?: string;
}

export function TaskAssignmentWidget({ initialTasks, users, currentUserId }: TaskAssignmentWidgetProps) {
    const [task, setTask] = useState('');
    const [assignee, setAssignee] = useState('');
    const [dueDate, setDueDate] = useState('');

    const handleAssign = () => {
        if (!task || !assignee) return;
        alert(`Task assigned to ${assignee}: "${task}"`);
        setTask('');
        setAssignee('');
        setDueDate('');
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-md p-8 h-full relative overflow-hidden group">
            {/* Ambient Background Effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl opacity-50 -mr-10 -mt-10 pointer-events-none group-hover:opacity-70 transition-opacity" />

            <div className="flex justify-between items-center mb-6 relative z-10">
                <div>
                    <h3 className="text-xl font-semibold text-slate-800 tracking-tight flex items-center gap-2">
                        Quick Actions
                    </h3>
                    <p className="text-sm font-medium text-slate-400 mt-1">Assign tasks instantly</p>
                </div>
                <div className="bg-slate-50 px-3 py-1 rounded-full text-[10px] font-bold text-slate-400 border border-slate-100 uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                    <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                    Fast Track
                </div>
            </div>

            <div className="space-y-5 relative z-10">
                <div className="space-y-2">
                    <textarea
                        className="w-full p-4 rounded-xl bg-slate-50/50 border-slate-100 border-2 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 text-slate-700 placeholder:text-slate-400 resize-none text-sm transition-all focus:bg-white min-h-[100px] outline-none shadow-sm"
                        placeholder="Draft the motion on notice for Suit CV/2024/005..."
                        value={task}
                        onChange={(e) => setTask(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Assignee Select */}
                    <div className="space-y-2">
                        <div className="relative group/select">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <User className="h-4 w-4 text-slate-400 group-hover/select:text-teal-500 transition-colors" />
                            </div>
                            <select
                                className="block w-full pl-10 pr-4 py-3 text-sm rounded-xl border-slate-100 bg-slate-50/50 hover:bg-slate-50 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 cursor-pointer hover:border-slate-200 transition-all appearance-none text-slate-700 font-medium outline-none"
                                value={assignee}
                                onChange={(e) => setAssignee(e.target.value)}
                            >
                                <option value="">Select lawyer...</option>
                                {STAFF.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-slate-400 text-xs">▼</span>
                            </div>
                        </div>
                    </div>

                    {/* Date Picker */}
                    <div className="space-y-2">
                        <div className="relative group/date">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Calendar className="h-4 w-4 text-slate-400 group-hover/date:text-teal-500 transition-colors" />
                            </div>
                            <input
                                type="date"
                                className="block w-full pl-10 pr-4 py-3 text-sm rounded-xl border-slate-100 bg-slate-50/50 hover:bg-slate-50 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 hover:border-slate-200 transition-all text-slate-700 font-medium outline-none"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-2">
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-teal-600 hover:bg-teal-50 pl-2 pr-4 rounded-full transition-all group/attach">
                        <Paperclip className="w-4 h-4 mr-2 group-hover/attach:rotate-45 transition-transform" />
                        Attach File
                    </Button>

                    <Button
                        onClick={handleAssign}
                        disabled={!task || !assignee}
                        className={cn(
                            "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 px-8 rounded-xl shadow-lg shadow-slate-900/20",
                            (!task || !assignee) && "opacity-50 cursor-not-allowed hover:shadow-none hover:translate-y-0"
                        )}
                    >
                        Assign Task <Send className="w-3 h-3 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

// Remove default export
