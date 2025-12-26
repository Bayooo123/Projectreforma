import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Activity, FileText, UserPlus, Scale, MessageSquare, ArrowRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Button } from '@/components/ui/Button';
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
        if (activityType.includes('document')) return <FileText className="w-4 h-4 text-white" />;
        if (activityType.includes('client')) return <UserPlus className="w-4 h-4 text-white" />;
        if (activityType.includes('court')) return <Scale className="w-4 h-4 text-white" />;
        if (activityType.includes('note')) return <MessageSquare className="w-4 h-4 text-white" />;
        return <Activity className="w-4 h-4 text-white" />;
    };

    const getIconBg = (activityType: string) => {
        if (activityType.includes('document')) return 'bg-blue-500';
        if (activityType.includes('client')) return 'bg-green-500';
        if (activityType.includes('court')) return 'bg-purple-500';
        if (activityType.includes('note')) return 'bg-amber-500';
        return 'bg-slate-500';
    };

    return (
        <Card className="h-full shadow-sm hover:shadow-md transition-shadow border-t-4 border-t-slate-500">
            <CardHeader className="pb-4 border-b border-slate-50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold flex items-center text-slate-800">
                        <Activity className="w-5 h-5 mr-3 text-slate-600" />
                        Firm Pulse
                    </CardTitle>
                    <Link href="/analytics">
                        <div className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                            Live Feed
                        </div>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                    {logs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                <Activity className="w-6 h-6 text-slate-300" />
                            </div>
                            <p>No recent firm activity.</p>
                        </div>
                    ) : (
                        <div className="relative pl-8 pr-6 py-6 space-y-8">
                            {/* Vertical Line */}
                            <div className="absolute left-[30px] top-6 bottom-6 w-px bg-slate-200" />

                            {logs.map((log) => (
                                <div key={log.id} className="relative group">
                                    {/* Icon Bubble */}
                                    <div className={`absolute -left-[30px] top-1 h-8 w-8 rounded-full ${getIconBg(log.activityType)} flex items-center justify-center shadow-sm ring-4 ring-white z-10 group-hover:scale-110 transition-transform`}>
                                        {getIcon(log.activityType)}
                                    </div>

                                    <div className="flex flex-col gap-1.5 p-3 rounded-lg hover:bg-slate-50 transition-colors -mt-2">
                                        <div className="flex justify-between items-start">
                                            <p className="text-sm text-slate-800 leading-snug">
                                                <span className="font-bold">{log.performedBy}</span>
                                                {' '}
                                                <span className="text-slate-600">{log.description.toLowerCase()}</span>
                                            </p>
                                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">
                                                {isToday(new Date(log.timestamp)) ? formatTime(new Date(log.timestamp)) : new Date(log.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>

                                        {log.entityName && (
                                            <div className="flex items-center text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded w-fit group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-slate-100">
                                                {log.type === 'matter' ? <Scale className="w-3 h-3 mr-1.5" /> : <FileText className="w-3 h-3 mr-1.5" />}
                                                {log.entityName}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
