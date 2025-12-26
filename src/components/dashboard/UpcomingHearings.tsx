import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Calendar, Gavel, MapPin, Clock } from 'lucide-react';
import Link from 'next/link';

interface Hearing {
    id: string;
    caseNumber: string;
    name: string;
    court: string | null;
    judge: string | null;
    nextCourtDate: Date | null;
}

interface UpcomingHearingsProps {
    hearings: Hearing[];
}

export function UpcomingHearings({ hearings }: UpcomingHearingsProps) {
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            // hour: 'numeric',
            // minute: 'numeric'
        }).format(date);
    };

    const getDaysUntil = (date: Date) => {
        const today = new Date();
        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        return `In ${diffDays} days`;
    };

    return (
        <Card className="h-full shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center">
                        <Gavel className="w-5 h-5 mr-2 text-primary" />
                        Upcoming Hearings
                    </CardTitle>
                    <Link href="/calendar" className="text-xs text-primary hover:underline">
                        View Calendar
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                {hearings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        No active court dates in the next 30 days.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {hearings.map((hearing) => (
                            <div key={hearing.id} className="group relative pl-4 border-l-2 border-slate-200 hover:border-primary transition-colors">
                                <Link href={`/calendar?matterId=${hearing.id}`} className="block">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-1">
                                            {hearing.name}
                                        </h4>
                                        <Badge variant="outline" className="text-xs shrink-0 ml-2 bg-slate-50">
                                            {hearing.nextCourtDate ? getDaysUntil(new Date(hearing.nextCourtDate)) : ''}
                                        </Badge>
                                    </div>

                                    <div className="text-xs text-muted-foreground flex flex-col gap-1">
                                        <span className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded w-fit text-slate-600">
                                            {hearing.caseNumber}
                                        </span>

                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="flex items-center">
                                                <Calendar className="w-3 h-3 mr-1" />
                                                {hearing.nextCourtDate ? formatDate(new Date(hearing.nextCourtDate)) : 'No Date'}
                                            </span>
                                            {hearing.court && (
                                                <span className="flex items-center" title={hearing.court}>
                                                    <MapPin className="w-3 h-3 mr-1" />
                                                    {hearing.court.split(',')[0]}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
