import { Calendar as CalendarIcon, Clock, MapPin, MoreVertical, FileText, ChevronRight, CheckCircle2, AlertCircle, Mic, Gavel, Users, Briefcase } from 'lucide-react';
import { CalendarEvent, CalendarEventType } from '@/types/legal';
import styles from './EventList.module.css';

interface EventListProps {
    events: CalendarEvent[];
}

const EventList = ({ events }: EventListProps) => {
    // Group events by date label (e.g., "Tomorrow", "Wednesday, Nov 26")
    const groupEventsByDate = () => {
        const groups: Record<string, CalendarEvent[]> = {};
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const today = new Date(now);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        events.forEach(event => {
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0);

            let label = '';
            if (eventDate.getTime() === today.getTime()) {
                label = 'Today';
            } else if (eventDate.getTime() === tomorrow.getTime()) {
                label = 'Tomorrow';
            } else {
                label = new Intl.DateTimeFormat('en-GB', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                }).format(eventDate);
            }

            if (!groups[label]) groups[label] = [];
            groups[label].push(event);
        });

        // Simple sort: strictly by date (logic could be more robust)
        return Object.entries(groups).sort((a, b) => {
            const dateA = new Date(a[1][0].date).getTime();
            const dateB = new Date(b[1][0].date).getTime();
            return dateA - dateB;
        });
    };

    const getIcon = (type: CalendarEventType) => {
        switch (type) {
            case 'COURT_DATE': return Gavel;
            case 'FILING_DEADLINE': return Clock;
            case 'CLIENT_MEETING': return Users;
            case 'INTERNAL_MEETING': return Briefcase;
            default: return CalendarIcon;
        }
    };

    const sortedGroups = groupEventsByDate();

    if (events.length === 0) {
        return (
            <div className={styles.container}>
                <div className="p-8 text-center text-slate-400 italic text-sm">
                    No upcoming events scheduled.
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Calendar Agenda</h3>
            </div>

            <div className={styles.list}>
                {sortedGroups.map(([label, groupEvents]) => (
                    <div key={label} className={styles.group}>
                        <h4 className={styles.groupTitle}>{label}</h4>
                        {groupEvents.map(event => {
                            const Icon = getIcon(event.type);
                            const eventTime = new Intl.DateTimeFormat('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit'
                            }).format(new Date(event.date));

                            return (
                                <div key={event.id} className={`${styles.eventCard} flex flex-col gap-3 h-auto`}>
                                    <div className="flex items-center gap-3">
                                        <div className={styles.timeBadge}>{eventTime}</div>
                                        <div className={styles.eventContent}>
                                            <h5 className={styles.eventTitle}>{event.matter?.name || event.title || 'Event'}</h5>
                                            <div className={styles.eventMeta}>
                                                <Icon size={14} />
                                                <span>{event.title || event.type.replace('_', ' ')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {event.meetingRecording && (
                                        <div className="mt-2 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 flex flex-col gap-3">
                                            {event.meetingRecording.audioUrl && (
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-500/20 rounded-full text-blue-400">
                                                        <Mic size={14} />
                                                    </div>
                                                    <audio 
                                                        src={event.meetingRecording.audioUrl} 
                                                        controls 
                                                        className="h-8 w-full max-w-[200px] opacity-80" 
                                                    />
                                                </div>
                                            )}
                                            
                                            {event.meetingRecording.transcriptText && (
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                        <FileText size={12} />
                                                        <span>Verbatim Transcript</span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-300 line-clamp-3 italic leading-relaxed bg-slate-900/50 p-2 rounded-lg border border-slate-700/30">
                                                        "{event.meetingRecording.transcriptText}"
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EventList;
