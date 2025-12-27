import { X, MapPin, Calendar, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface Hearing {
    id: string;
    caseNumber: string;
    name: string;
    court: string | null;
    judge: string | null;
    nextCourtDate: Date | null;
}

interface CourtDatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    hearings: Hearing[];
}

export function CourtDatesModal({ isOpen, onClose, hearings }: CourtDatesModalProps) {
    if (!isOpen) return null;

    const formatDateBadge = (date: Date) => {
        return new Intl.DateTimeFormat('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        }).format(date).toUpperCase() + ' • ' +
            new Intl.DateTimeFormat('en-GB', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            }).format(date);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-[90%] max-w-[700px] max-h-[80vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-semibold text-slate-800">Court Dates - Next 7 Days</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-800 transition-colors p-1 rounded-full hover:bg-slate-100"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 md:p-8">
                    {hearings.length === 0 ? (
                        <div className="text-center py-12 px-4 text-slate-500">
                            <p>No upcoming court dates in the next 7 days.</p>
                        </div>
                    ) : (
                        hearings.map((hearing) => (
                            <div key={hearing.id} className="p-5 border border-slate-200 rounded-xl mb-3 hover:border-[#0f5f5a] hover:bg-[#f8fffe] transition-all group">
                                {hearing.nextCourtDate && (
                                    <div className="inline-block px-3 py-1 bg-[#0f5f5a] text-white rounded-md text-xs font-bold mb-3 shadow-md shadow-teal-900/10">
                                        {formatDateBadge(new Date(hearing.nextCourtDate))}
                                    </div>
                                )}
                                <div className="font-semibold text-slate-800 text-[15px] mb-2 group-hover:text-[#0f5f5a] transition-colors">
                                    {hearing.name} <span className="text-slate-400 font-normal text-xs ml-1">({hearing.caseNumber})</span>
                                </div>
                                <div className="space-y-1">
                                    {hearing.court && (
                                        <div className="flex items-center text-[13px] text-slate-500">
                                            <MapPin size={14} className="mr-2 text-slate-400 shrink-0" />
                                            {hearing.court}
                                        </div>
                                    )}
                                    {/* Placeholder for hearing type if data was available */}
                                    <div className="flex items-center text-[13px] text-slate-500">
                                        <Scale size={14} className="mr-2 text-slate-400 shrink-0" />
                                        Hearing
                                    </div>
                                    {hearing.judge && (
                                        <div className="flex items-center text-[13px] text-slate-500">
                                            <span className="mr-2 text-slate-400 text-[10px]">👨‍⚖️</span>
                                            {hearing.judge}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
