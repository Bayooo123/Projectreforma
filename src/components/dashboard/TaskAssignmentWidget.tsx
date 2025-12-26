import { useState } from 'react';
import { Send, Paperclip, User, Calendar, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

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
    const [isFocused, setIsFocused] = useState(false);

    const handleAssign = () => {
        if (!task || !assignee) return;
        alert(`Task assigned to ${assignee}: "${task}"`);
        setTask('');
        setAssignee('');
        setDueDate('');
        setIsFocused(false);
    };

    return (
        <Card className={`border-2 transition-all duration-200 ${isFocused ? 'border-primary ring-4 ring-primary/10' : 'border-slate-200'}`}>
            <CardHeader className="pb-3 border-b border-slate-50">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-slate-800">Assign New Task</CardTitle>
                    <div className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                        Quick Action
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="space-y-4">
                    <div className="relative">
                        <textarea
                            className="w-full min-h-[100px] p-4 rounded-lg bg-slate-50 border-0 focus:ring-0 text-slate-700 placeholder:text-slate-400 resize-none text-sm transition-all focus:bg-white"
                            placeholder="Describe the task (e.g., 'Draft the motion on notice for Suit CV/2024/005')..."
                            value={task}
                            onChange={(e) => setTask(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => !task && !assignee && setIsFocused(false)}
                        />
                    </div>

                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 transition-opacity duration-300 ${isFocused || task ? 'opacity-100' : 'opacity-60 grayscale'}`}>
                        {/* Assignee Select */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-4 w-4 text-slate-400" />
                            </div>
                            <select
                                className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border-slate-200 bg-white focus:ring-primary focus:border-primary cursor-pointer hover:border-slate-300 transition-colors appearance-none"
                                value={assignee}
                                onChange={(e) => setAssignee(e.target.value)}
                            >
                                <option value="">Assign to...</option>
                                {STAFF.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-slate-400 text-xs">▼</span>
                            </div>
                        </div>

                        {/* Date Picker */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Calendar className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                type="date"
                                className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border-slate-200 bg-white focus:ring-primary focus:border-primary hover:border-slate-300 transition-colors"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-primary hover:bg-primary/5">
                            <Paperclip className="w-4 h-4 mr-2" />
                            Attach File
                        </Button>

                        <Button
                            onClick={handleAssign}
                            disabled={!task || !assignee}
                            className={`transition-all duration-300 ${(!task || !assignee) ? 'opacity-50' : 'hover:scale-105 active:scale-95 shadow-lg shadow-primary/20'}`}
                        >
                            Assign Task <Send className="w-3 h-3 ml-2" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Remove default export
