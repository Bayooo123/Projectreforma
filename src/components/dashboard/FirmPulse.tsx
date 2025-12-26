import { Activity, FileText, UserPlus, Scale, MessageSquare } from 'lucide-react';
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
        if (activityType.includes('document')) return <FileText className="w-4 h-4 text-teal-600" />;
        if (activityType.includes('client')) return <UserPlus className="w-4 h-4 text-emerald-600" />;
        if (activityType.includes('court')) return <Scale className="w-4 h-4 text-teal-700" />;
        if (activityType.includes('note')) return <MessageSquare className="w-4 h-4 text-teal-500" />;
        return <Activity className="w-4 h-4 text-slate-400" />;
    };

    const getIconBg = (activityType: string) => {
        if (activityType.includes('document')) return 'bg-teal-50';
        if (activityType.includes('client')) return 'bg-emerald-50';
        if (activityType.includes('court')) return 'bg-teal-50';
        if (activityType.includes('note')) return 'bg-teal-50';
        return 'bg-slate-50';
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col hover:shadow-md transition-all duration-300">
            {/* Header - Softened */}
            <div className="bg-emerald-50/30 p-6 flex justify-between items-center border-b border-emerald-100/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 tracking-tight">Firm Pulse</h3>
                        <p className="text-xs font-medium text-slate-500">Live activity feed</p>
                    </div>
                </div>
                <Link href="/analytics">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-emerald-100 shadow-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">Live</span>
                    </div>
                </Link>
            </div>

            <div className="p-0 flex-1 bg-white">
                <ScrollArea className="h-[600px]">
                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center h-full">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                <Activity className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-slate-500 text-sm">No recent activity recorded.</p>
                        </div>
                    ) : (
                        <div className="relative pl-8 pr-6 py-6 space-y-8">
                            {/* Vertical Line - Softened */}
                            <div className="absolute left-[30px] top-6 bottom-6 w-px bg-slate-100" />

                            {logs.map((log) => (
                                <div key={log.id} className="relative group">
                                    {/* Icon Bubble */}
                                    <div className={`absolute -left-[30px] top-1 h-8 w-8 rounded-full ${getIconBg(log.activityType)} flex items-center justify-center shadow-sm border-2 border-white z-10 transition-transform group-hover:scale-110`}>
                                        {getIcon(log.activityType)}
                                    </div>

                                    <div className="flex flex-col gap-1.5 p-3 rounded-xl group-hover:bg-slate-50/80 transition-colors -mt-2">
                                        <div className="flex justify-between items-start">
                                            <p className="text-sm text-slate-700 leading-snug">
                                                <span className="font-semibold text-slate-900">{log.performedBy}</span>
                                                {' '}
                                                <span className="text-slate-500 font-light">{log.description.toLowerCase()}</span>
                                            </p>
                                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">
                                                {isToday(new Date(log.timestamp)) ? formatTime(new Date(log.timestamp)) : new Date(log.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>

                                        {log.entityName && (
                                            <div className="flex items-center text-[10px] font-medium text-slate-500 bg-white px-2 py-1 rounded-md w-fit border border-slate-100 shadow-sm group-hover:border-slate-200 transition-all">
                                                {log.type === 'matter' ? <Scale className="w-3 h-3 mr-1.5 text-slate-400" /> : <FileText className="w-3 h-3 mr-1.5 text-slate-400" />}
                                                {log.entityName}
                                            </div>
                                        )}
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
