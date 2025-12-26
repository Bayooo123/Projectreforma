import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Calendar, Gavel, MapPin, Clock, ArrowRight } from 'lucide-react';
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

    const getBadgeVariant = (daysText: string) => {
        if (daysText === 'Today') return 'destructive';
        if (daysText === 'Tomorrow') return 'secondary'; // using secondary which is usually orange/yellow/purple depending on theme, or we can use custom class
        return 'outline';
    };

    return (
        <Card className="h-full shadow-sm hover:shadow-md transition-shadow border-t-4 border-t-purple-500">
            <CardHeader className="pb-4 border-b border-slate-50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold flex items-center text-slate-800">
                        <Gavel className="w-5 h-5 mr-3 text-purple-600" />
                        Upcoming Hearings
                    </CardTitle>
                    <Link href="/calendar">
                        <Button variant="ghost" size="sm" className="text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                            View Calendar <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {hearings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <div className="p-4 bg-slate-50 rounded-full mb-3">
                            <Calendar className="w-8 h-8 text-slate-300" />
                        </div>
                        <h4 className="text-slate-900 font-medium mb-1">No hearings this week</h4>
                        <p className="text-slate-500 text-sm max-w-[200px]">You have no upcoming court dates scheduled for the next 7 days.</p>
                        <Link href="/calendar/new" className="mt-4">
                            <Button variant="outline" size="sm">Schedule Hearing</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {hearings.map((hearing) => {
                            const daysText = hearing.nextCourtDate ? getDaysUntil(new Date(hearing.nextCourtDate)) : '';
                            return (
                                <Link
                                    href={`/calendar?matterId=${hearing.id}`}
                                    key={hearing.id}
                                    className="block p-4 hover:bg-slate-50 transition-colors group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <h4 className="font-semibold text-slate-900 truncate group-hover:text-purple-700 transition-colors">
                                                {hearing.name}
                                            </h4>
                                            <div className="flex items-center text-xs text-slate-500 mt-1">
                                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 mr-2">
                                                    {hearing.caseNumber}
                                                </span>
                                                {hearing.court && (
                                                    <span className="flex items-center truncate" title={hearing.court}>
                                                        <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                                                        {hearing.court.split(',')[0]}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Badge
                                            variant={getBadgeVariant(daysText) as any}
                                            className="shrink-0 whitespace-nowrap"
                                        >
                                            {daysText}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between mt-3 text-sm">
                                        <div className="flex items-center text-slate-600 font-medium bg-purple-50 px-2 py-1 rounded text-xs">
                                            <Calendar className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                                            {hearing.nextCourtDate ? formatDate(new Date(hearing.nextCourtDate)) : 'No Date'}
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-400 -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
