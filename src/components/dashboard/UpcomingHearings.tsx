import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Calendar, Gavel, MapPin, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
        if (daysText === 'Tomorrow') return 'secondary';
        return 'outline';
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-lg h-full flex flex-col">
            {/* Colored Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 flex justify-between items-center text-white">
                <div>
                    <h3 className="text-xl font-medium flex items-center">
                        <Gavel className="w-5 h-5 mr-3 opacity-90" />
                        Upcoming Hearings
                    </h3>
                    <p className="text-sm font-light opacity-90 mt-1">Court dates for the next 7 days</p>
                </div>
                <Link href="/calendar">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white border-white/20 border">
                        View Calendar
                    </Button>
                </Link>
            </div>

            <div className="p-6 flex-1 bg-white">
                {hearings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center h-full">
                        <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center mb-6">
                            <Calendar className="w-10 h-10 text-purple-400" />
                        </div>
                        <h4 className="text-slate-900 font-medium text-lg mb-2">No hearings this week</h4>
                        <p className="text-slate-500 font-light max-w-[200px] mb-6">Your calendar is clear. Enjoy the focus time.</p>
                        <Link href="/calendar/new">
                            <Button className="bg-gradient-to-r from-purple-500 to-pink-600 border-0 hover:shadow-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300">
                                Schedule Hearing
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {hearings.map((hearing) => {
                            const daysText = hearing.nextCourtDate ? getDaysUntil(new Date(hearing.nextCourtDate)) : '';
                            return (
                                <Link
                                    href={`/calendar?matterId=${hearing.id}`}
                                    key={hearing.id}
                                    className="block p-4 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <h4 className="font-semibold text-slate-900 truncate group-hover:text-purple-600 transition-colors">
                                                {hearing.name}
                                            </h4>
                                            <div className="flex items-center text-xs text-slate-500 mt-1">
                                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 mr-2 border border-slate-200">
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
                                        <div className="flex items-center text-slate-600 font-medium bg-purple-50 px-3 py-1 rounded-full text-xs">
                                            <Calendar className="w-3.5 h-3.5 mr-2 text-purple-600" />
                                            {hearing.nextCourtDate ? formatDate(new Date(hearing.nextCourtDate)) : 'No Date'}
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
