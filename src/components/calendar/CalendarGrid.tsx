"use client";

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Gavel, Loader, Clock, Users, Briefcase, Calendar } from 'lucide-react';
import styles from './CalendarGrid.module.css';

export type CalendarEventType = 'COURT_DATE' | 'FILING_DEADLINE' | 'CLIENT_MEETING' | 'INTERNAL_MEETING' | 'OTHER';

export interface CalendarEvent {
    id: string;
    date: Date;
    type: CalendarEventType;
    title: string | null;
    proceedings: string | null;
    adjournedFor: string | null;
    matterId: string | null;
    matter?: {
        id: string;
        caseNumber: string | null;
        name: string;
        client?: { name: string } | null;
    } | null;
    appearances: { id: string; name: string | null; image: string | null }[];
}

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
    const eventsByDay: Record<number, CalendarEvent[]> = {};

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
            const isPast = new Date(event.date) < new Date() && new Date(event.date).getDate() !== new Date().getDate();

            const getEventConfig = (type: CalendarEventType) => {
                switch (type) {
                    case 'COURT_DATE':
                        return { icon: Gavel, color: '#3182CE', bg: '#EBF8FF', hover: '#BEE3F8', border: '#3182CE' };
                    case 'FILING_DEADLINE':
                        return { icon: Clock, color: '#E53E3E', bg: '#FFF5F5', hover: '#FED7D7', border: '#E53E3E' };
                    case 'CLIENT_MEETING':
                        return { icon: Users, color: '#38A169', bg: '#F0FFF4', hover: '#C6F6D5', border: '#38A169' };
                    case 'INTERNAL_MEETING':
                        return { icon: Briefcase, color: '#805AD5', bg: '#FAF5FF', hover: '#E9D8FD', border: '#805AD5' };
                    default:
                        return { icon: Calendar, color: '#718096', bg: '#F7FAFC', hover: '#EDF2F7', border: '#718096' };
                }
            };

            const config = getEventConfig(event.type);
            const Icon = config.icon;

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
                        backgroundColor: isPast ? '#f3f4f6' : config.bg,
                        borderLeft: isPast ? '2px solid #9ca3af' : `2px solid ${config.border}`,
                        marginBottom: '2px',
                        padding: '2px 4px',
                        fontSize: '11px',
                        borderRadius: '2px'
                    }}
                    title={`${event.title || 'Event'} - ${event.matter?.name || 'No Matter'}`}
                >
                    <Icon size={10} style={{ color: isPast ? '#9ca3af' : config.color }} />
                    <span className={styles.caseName} style={{ color: isPast ? '#718096' : config.color }}>
                        {maybeTruncate(event.matter?.name || event.title || 'Event')}
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
