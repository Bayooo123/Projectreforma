import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, FileText, UserPlus, Scale, MessageSquare, Briefcase } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActiveLog {
    id: string;
    type: string; // 'matter' | 'brief'
    activityType: string;
    description: string;
    performedBy: string; // User Name
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
        if (activityType.includes('document')) return <FileText className="w-4 h-4 text-blue-500" />;
        if (activityType.includes('client')) return <UserPlus className="w-4 h-4 text-green-500" />;
        if (activityType.includes('court')) return <Scale className="w-4 h-4 text-purple-500" />;
        if (activityType.includes('note')) return <MessageSquare className="w-4 h-4 text-amber-500" />;
        return <Activity className="w-4 h-4 text-slate-500" />;
    };

    return (
        <Card className="h-full shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-primary" />
                    Firm Pulse
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[350px] px-6 py-2">
                    {logs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No recent activity recorded.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {logs.map((log, index) => (
                                <div key={log.id} className="relative pl-6 pb-2 border-l border-slate-200 last:border-0">
                                    {/* Dot */}
                                    <div className="absolute -left-[5px] top-1 bg-white">
                                        {getIcon(log.activityType)}
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm">
                                            <span className="font-semibold text-slate-700">{log.performedBy}</span>
                                            <span className="text-slate-600"> {log.description.toLowerCase()}</span>
                                            {log.entityName && (
                                                <span className="font-medium text-primary"> • {log.entityName}</span>
                                            )}
                                        </p>
                                        <span className="text-xs text-muted-foreground">
                                            {isToday(new Date(log.timestamp)) ? formatTime(new Date(log.timestamp)) : new Date(log.timestamp).toLocaleDateString()}
                                        </span>
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
