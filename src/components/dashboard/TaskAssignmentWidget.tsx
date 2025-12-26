import { useState } from 'react';
import { Send, User, Calendar, Plus, Paperclip } from 'lucide-react';
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
        <div className="bg-white rounded-2xl border border-slate-200 p-8 transition-all duration-300 hover:shadow-lg h-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-medium text-slate-800">Quick Actions</h3>
                    <p className="text-sm font-light text-slate-500 mt-1">Assign tasks or schedule events instantly</p>
                </div>
                <div className="bg-slate-50 px-3 py-1 rounded-lg text-xs font-medium text-slate-500 border border-slate-100 uppercase tracking-wide">
                    New Task
                </div>
            </div>

            <div className="space-y-5">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600 ml-1">Task Description</label>
                    <textarea
                        className="w-full p-4 rounded-xl bg-slate-50 border-slate-200 border focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-700 placeholder:text-slate-400 resize-none text-sm transition-all focus:bg-white min-h-[100px]"
                        placeholder="Draft the motion on notice for Suit CV/2024/005..."
                        value={task}
                        onChange={(e) => setTask(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Assignee Select */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600 ml-1">Assignee</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-4 w-4 text-slate-400" />
                            </div>
                            <select
                                className="block w-full pl-10 pr-4 py-3 text-sm rounded-xl border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer hover:border-slate-300 transition-all appearance-none text-slate-700"
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
                        <label className="text-sm font-medium text-slate-600 ml-1">Due Date</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Calendar className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                type="date"
                                className="block w-full pl-10 pr-4 py-3 text-sm rounded-xl border-slate-200 bg-slate-50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 hover:border-slate-300 transition-all text-slate-700"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-4">
                    <Button variant="ghost" size="sm" className="text-slate-500 hover:text-teal-600 hover:bg-teal-50 pl-0">
                        <Paperclip className="w-4 h-4 mr-2" />
                        Attach File
                    </Button>

                    <Button
                        onClick={handleAssign}
                        disabled={!task || !assignee}
                        className={cn(
                            "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg transition-all duration-300 px-6",
                            (!task || !assignee) && "opacity-50 cursor-not-allowed hover:shadow-none"
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
