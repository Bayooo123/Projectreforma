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
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white rounded-[16px] w-[90%] max-w-[700px] max-h-[80vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-200">
                <div className="p-[32px] border-b border-[#e2e8f0] flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-[20px] font-semibold text-[#1a202c]">Court Dates - Next 7 Days</h2>
                    <button
                        onClick={onClose}
                        className="text-[#718096] hover:text-[#1a202c] transition-colors text-[24px] leading-none"
                    >
                        ×
                    </button>
                </div>

                <div className="p-[32px]">
                    {hearings.length === 0 ? (
                        <div className="text-center py-12 px-4 text-slate-500">
                            <p>No upcoming court dates in the next 7 days.</p>
                        </div>
                    ) : (
                        hearings.map((hearing) => (
                            <div key={hearing.id} className="p-[20px] border border-[#e2e8f0] rounded-[10px] mb-[12px] hover:border-[#0f5f5a] hover:bg-[#f8fffe] transition-all group">
                                {hearing.nextCourtDate && (
                                    <div className="inline-block px-[12px] py-[4px] bg-[#0f5f5a] text-white rounded-[6px] text-[12px] font-semibold mb-[12px]">
                                        {formatDateBadge(new Date(hearing.nextCourtDate))}
                                    </div>
                                )}
                                <div className="font-semibold text-[#1a202c] text-[15px] mb-[8px]">
                                    {hearing.name} <span className="text-[#718096] font-normal text-xs ml-1">({hearing.caseNumber})</span>
                                </div>
                                <div className="space-y-[4px]">
                                    {hearing.court && (
                                        <div className="flex items-center text-[13px] text-[#718096]">
                                            <span className="mr-2">📍</span>
                                            {hearing.court}
                                        </div>
                                    )}
                                    {/* Placeholder for hearing type if data was available */}
                                    <div className="flex items-center text-[13px] text-[#718096]">
                                        <span className="mr-2">⚖️</span>
                                        Hearing
                                    </div>
                                    {hearing.judge && (
                                        <div className="flex items-center text-[13px] text-[#718096]">
                                            <span className="mr-2">👨‍⚖️</span>
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
