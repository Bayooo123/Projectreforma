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
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col group transition-all hover:shadow-md">
            {/* Header - Softened */}
            <div className="bg-slate-50/50 p-6 flex justify-between items-center border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                        <Gavel className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 tracking-tight">Upcoming Hearings</h3>
                        <p className="text-xs font-medium text-slate-500">Next 7 days</p>
                    </div>
                </div>
                <Link href="/calendar">
                    <Button variant="ghost" size="sm" className="text-teal-700 hover:text-teal-800 hover:bg-teal-50 text-xs font-medium">
                        View Calendar
                    </Button>
                </Link>
            </div>

            <div className="p-6 flex-1 bg-white">
                {hearings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center h-full">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                            <Calendar className="w-8 h-8 text-slate-300" />
                        </div>
                        <h4 className="text-slate-900 font-medium text-base mb-2">No hearings this week</h4>
                        <p className="text-slate-400 font-light text-sm max-w-[200px] mb-6">Your calendar is clear. Enjoy the focus time.</p>
                        <Link href="/calendar/new">
                            <Button className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-lg shadow-teal-900/10 transition-all">
                                Schedule Hearing
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {hearings.map((hearing) => {
                            const daysText = hearing.nextCourtDate ? getDaysUntil(new Date(hearing.nextCourtDate)) : '';
                            return (
                                <Link
                                    href={`/calendar?matterId=${hearing.id}`}
                                    key={hearing.id}
                                    className="block p-4 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group/item"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <h4 className="font-semibold text-slate-800 text-sm truncate group-hover/item:text-teal-700 transition-colors">
                                                {hearing.name}
                                            </h4>
                                            <div className="flex items-center text-xs text-slate-500 mt-1.5">
                                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 mr-2 border border-slate-200">
                                                    {hearing.caseNumber}
                                                </span>
                                                {hearing.court && (
                                                    <span className="flex items-center truncate max-w-[150px]" title={hearing.court}>
                                                        <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                                                        {hearing.court.split(',')[0]}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Badge
                                            variant={getBadgeVariant(daysText) as any}
                                            className="shrink-0 whitespace-nowrap text-[10px] px-2"
                                        >
                                            {daysText}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between mt-3 text-sm">
                                        <div className="flex items-center text-slate-600 font-medium bg-slate-50 px-3 py-1 rounded-full text-[11px] border border-slate-100">
                                            <Calendar className="w-3 h-3 mr-2 text-slate-400" />
                                            {hearing.nextCourtDate ? formatDate(new Date(hearing.nextCourtDate)) : 'No Date'}
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-teal-500 opacity-0 group-hover/item:opacity-100 transform translate-x-[-10px] group-hover/item:translate-x-0 transition-all duration-300" />
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
