import { Activity, FileText, UserPlus, Scale, MessageSquare, Mail, CreditCard, Layers } from 'lucide-react';
import { ScrollArea } from '@/components/ui/ScrollArea';
import Link from 'next/link';

interface ActiveLog {
    id: string;
    type: string;
    activityType: string;
    description: string;
    performedBy: string;
    timestamp: Date;
    entityName?: string;
}

interface FirmPulseProps {
    logs: ActiveLog[];
}

export function FirmPulse({ logs }: FirmPulseProps) {
    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat('en-GB', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        }).format(date);
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const getIcon = (activityType: string) => {
        if (activityType.includes('email')) return <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
        if (activityType.includes('document')) return <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />;
        if (activityType.includes('client')) return <UserPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
        if (activityType.includes('court')) return <Scale className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
        if (activityType.includes('note')) return <MessageSquare className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />;
        return <Activity className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />;
    };

    const getIconBg = (activityType: string) => {
        if (activityType.includes('email')) return 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
        if (activityType.includes('document')) return 'bg-teal-100 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800';
        if (activityType.includes('client')) return 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800';
        if (activityType.includes('court')) return 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800';
        if (activityType.includes('note')) return 'bg-violet-100 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800';
        return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    };

    return (
        <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-white/5 shadow-lg overflow-hidden h-full flex flex-col hover:shadow-xl transition-all duration-300">
            {/* Header */}
            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-6 flex justify-between items-center border-b border-emerald-100/50 dark:border-emerald-800/30 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200 dark:border-emerald-800/50">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Firm Pulse</h3>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Live system activity</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 dark:bg-slate-800/50 border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Live</span>
                </div>
            </div>

            <div className="p-0 flex-1 bg-transparent">
                <ScrollArea className="h-[600px]">
                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center h-full opacity-60">
                            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                <Layers className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">No recent activity detected.</p>
                        </div>
                    ) : (
                        <div className="relative pl-8 pr-6 py-8 space-y-8">
                            {/* Vertical Line */}
                            <div className="absolute left-[30px] top-8 bottom-8 w-[2px] bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-700 to-transparent" />

                            {logs.map((log) => (
                                <div key={log.id} className="relative group">
                                    {/* Icon Bubble */}
                                    <div className={`absolute -left-[30px] top-1 h-8 w-8 rounded-full ${getIconBg(log.activityType)} border-2 flex items-center justify-center shadow-sm z-10 transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                                        {getIcon(log.activityType)}
                                    </div>

                                    <div className="flex flex-col gap-1.5 p-3 rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 hover:shadow-sm border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/50 transition-all -mt-2 ml-2">
                                        <div className="flex justify-between items-start">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                                                {log.description}
                                            </p>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap ml-2">
                                                {formatTime(new Date(log.timestamp))}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">
                                                {log.entityName || 'System'}
                                            </span>
                                            <span className="text-slate-400 dark:text-slate-500">•</span>
                                            <span className="text-slate-500 dark:text-slate-400">{log.performedBy}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
}
