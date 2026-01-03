"use client";

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Gavel, Loader } from 'lucide-react';
import styles from './CalendarGrid.module.css';

interface CourtEvent {
    id: string;
    date: Date;
    title: string | null;
    proceedings: string | null;
    adjournedFor: string | null;
    matterId: string;
    matter: {
        id: string;
        caseNumber: string;
        name: string;
        client: { name: string };
        assignedLawyer: { id: string; name: string | null };
    };
    appearances: { id: string; name: string | null; image: string | null }[];
}

interface CalendarGridProps {
    events: CourtEvent[];
    currentDate: Date;
    onDateChange: (date: Date) => void;
    onEventClick: (event: CourtEvent) => void;
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
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        onDateChange(newDate);
    };

    const goToNextMonth = () => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        onDateChange(newDate);
    };

    const goToToday = () => {
        onDateChange(new Date());
    };

    // Group events by day of month
    // Note: We need to filter events that match the current month first? 
    // Or just map them. Ideally events passed are already relevant or we handle date checking.
    // If we passed ALL workspace events, we must check month here.
    const eventsByDay: Record<number, CourtEvent[]> = {};

    events.forEach(event => {
        const eventDate = new Date(event.date);
        // Only include if in current month/year view
        if (
            eventDate.getMonth() === currentDate.getMonth() &&
            eventDate.getFullYear() === currentDate.getFullYear()
        ) {
            const day = eventDate.getDate();
            if (!eventsByDay[day]) {
                eventsByDay[day] = [];
            }
            eventsByDay[day].push(event);
        }
    });

    const renderEventsForDay = (day: number) => {
        const dayEvents = eventsByDay[day];
        if (!dayEvents || dayEvents.length === 0) return null;

        return dayEvents.map((event) => {
            // Determine styling based on status or type
            // e.g. past events vs new
            const isPast = new Date(event.date) < new Date() && new Date(event.date).getDate() !== new Date().getDate();

            return (
                <div
                    key={event.id}
                    className={styles.caseItem}
                    onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                    }}
                    style={{
                        cursor: 'pointer',
                        opacity: isPast ? 0.6 : 1,
                        backgroundColor: isPast ? '#f3f4f6' : undefined,
                        borderLeft: isPast ? '2px solid #9ca3af' : '2px solid var(--primary)',
                        marginBottom: '2px',
                        padding: '2px 4px',
                        fontSize: '11px',
                        borderRadius: '2px'
                    }}
                    title={`${event.title || 'Hearing'} - ${event.matter.name}`}
                >
                    <Gavel size={10} className={styles.caseIcon} />
                    <span className={styles.caseName}>
                        {maybeTruncate(event.matter.name)}
                    </span>
                </div>
            );
        });
    };

    const maybeTruncate = (str: string) => {
        return str.length > 20 ? str.substring(0, 20) + '...' : str;
    };

    const daysInMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
    ).getDate();

    const firstDayOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
    ).getDay();

    return (
        <div className={styles.container}>
            <div className={styles.controls}>
                <div className={styles.nav}>
                    <button onClick={goToPreviousMonth} className={styles.navBtn} disabled={isLoading}>
                        <ChevronLeft size={18} />
                    </button>
                    <h2 className={styles.monthLabel}>
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h2>
                    <button onClick={goToNextMonth} className={styles.navBtn} disabled={isLoading}>
                        <ChevronRight size={18} />
                    </button>
                </div>
                <button onClick={goToToday} className={styles.todayBtn} disabled={isLoading}>
                    Today
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader className="animate-spin text-gray-500" size={32} />
                </div>
            ) : (
                <div className={styles.grid}>
                    {/* Day headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className={styles.dayHeader}>
                            {day}
                        </div>
                    ))}

                    {/* Empty cells for days before the first of the month */}
                    {Array.from({ length: firstDayOfMonth }, (_, i) => (
                        <div key={`empty-${i}`} className={styles.dayCell}></div>
                    ))}

                    {/* Actual days of the month */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                        <div key={day} className={styles.dayCell}>
                            <span className={styles.dayNumber}>{day}</span>
                            <div className={styles.events}>
                                {renderEventsForDay(day)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CalendarGrid;
