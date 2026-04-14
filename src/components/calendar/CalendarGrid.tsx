"use client";

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Gavel, Loader, Clock, Users, Calendar, MapPin, User as UserIcon } from 'lucide-react';
import styles from './CalendarGrid.module.css';

import { CalendarEvent } from '@/types/legal';

interface CalendarGridProps {
    events: CalendarEvent[];
    currentDate: Date;
    onDateChange: (date: Date) => void;
    onEventClick: (event: CalendarEvent) => void;
    isLoading?: boolean;
}

const CalendarGrid = ({
    events,
    currentDate,
    onDateChange,
    onEventClick,
    isLoading = false,
}: CalendarGridProps) => {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const goToPreviousMonth = () => {
        onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        onDateChange(new Date());
    };

    const eventsByDay = useMemo(() => {
        const map: Record<number, CalendarEvent[]> = {};
        events.forEach(event => {
            const eventDate = new Date(event.date);
            if (
                eventDate.getMonth() === currentDate.getMonth() &&
                eventDate.getFullYear() === currentDate.getFullYear()
            ) {
                const day = eventDate.getDate();
                if (!map[day]) map[day] = [];
                map[day].push(event);
            }
        });
        return map;
    }, [events, currentDate]);

    const renderEvent = (event: CalendarEvent) => {
        const isPast = new Date(event.date) < new Date() && new Date(event.date).toDateString() !== new Date().toDateString();
        const isCourt = event.type === 'COURT';

        return (
            <div
                key={event.id}
                className={`${styles.eventCard} ${isPast ? styles.pastEvent : ''} ${isCourt ? styles.courtEvent : styles.meetingEvent}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                }}
            >
                <div className={styles.eventTime}>
                    {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
                <div className={styles.eventContent}>
                    <div className={styles.eventTitle}>
                        {isCourt ? <Gavel size={10} className={styles.eventIcon} /> : <Users size={10} className={styles.eventIcon} />}
                        <span>{event.matter?.name || event.title || 'Untitled Event'}</span>
                    </div>
                    {event.court && (
                        <div className={styles.eventMeta}>
                            <MapPin size={8} /> <span>{event.court}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const calendarDays = useMemo(() => {
        const days = [];
        // Fill previous month padding
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push({ type: 'padding', value: i });
        }
        // Fill current month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ type: 'day', value: i });
        }
        return days;
    }, [daysInMonth, firstDayOfMonth]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.monthNav}>
                    <button onClick={goToPreviousMonth} className={styles.iconBtn} disabled={isLoading}>
                        <ChevronLeft size={20} />
                    </button>
                    <h2 className={styles.currentMonth}>
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h2>
                    <button onClick={goToNextMonth} className={styles.iconBtn} disabled={isLoading}>
                        <ChevronRight size={20} />
                    </button>
                </div>
                <div className={styles.actions}>
                    <button onClick={goToToday} className={styles.todayBtn} disabled={isLoading}>
                        Today
                    </button>
                </div>
            </div>

            <div className={styles.calendarWrapper}>
                <div className={styles.dayHeaders}>
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                        <div key={day} className={styles.dayHeaderCell}>{day}</div>
                    ))}
                </div>

                <div className={styles.grid}>
                    {isLoading && (
                        <div className={styles.loadingOverlay}>
                            <Loader className="animate-spin" size={32} />
                        </div>
                    )}
                    
                    {calendarDays.map((dayObj, idx) => (
                        <div 
                            key={`${dayObj.type}-${dayObj.value}-${idx}`} 
                            className={`${styles.dayCell} ${dayObj.type === 'padding' ? styles.paddingCell : ''}`}
                        >
                            {dayObj.type === 'day' && (
                                <>
                                    <span className={`${styles.dayNumber} ${new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), dayObj.value).toDateString() ? styles.todayNumber : ''}`}>
                                        {dayObj.value}
                                    </span>
                                    <div className={styles.eventList}>
                                        {(eventsByDay[dayObj.value] || []).map(renderEvent)}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CalendarGrid;
