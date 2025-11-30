"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Gavel } from 'lucide-react';
import styles from './CalendarGrid.module.css';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THUR', 'FRI', 'SAT'];

interface CalendarGridProps {
    onEventClick?: () => void;
}

const CalendarGrid = ({ onEventClick }: CalendarGridProps) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        const fetchMatters = async () => {
            try {
                const response = await fetch('/api/matters');
                if (response.ok) {
                    const data = await response.json();
                    setEvents(data);
                }
            } catch (error) {
                console.error('Failed to fetch matters:', error);
            }
        };

        fetchMatters();
    }, []);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const currentMonthYear = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    // Calculate days in current month
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

    // Calculate the starting day of the week (0 = Sunday, 6 = Saturday)
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const renderEvent = (day: number) => {
        const currentMonthEvents = events.filter(e => {
            const eventDate = new Date(e.start);
            return eventDate.getDate() === day &&
                eventDate.getMonth() === currentDate.getMonth() &&
                eventDate.getFullYear() === currentDate.getFullYear();
        });

        if (currentMonthEvents.length === 0) return null;

        return currentMonthEvents.map((event, idx) => (
            <div
                key={event.id || idx}
                className={styles.caseItem}
                onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.();
                }}
                style={{ cursor: 'pointer' }}
                title={`${event.title} - ${event.court || ''}`}
            >
                <Gavel size={10} className={styles.caseIcon} />
                <span className={styles.caseName}>{event.title}</span>
            </div>
        ));
    };

    return (
        <div className={styles.container}>
            <div className={styles.controls}>
                <div className={styles.nav}>
                    <button className={styles.navBtn} onClick={goToPreviousMonth}>
                        <ChevronLeft size={20} />
                    </button>
                    <span className={styles.monthLabel}>{currentMonthYear}</span>
                    <button className={styles.navBtn} onClick={goToNextMonth}>
                        <ChevronRight size={20} />
                    </button>
                </div>
                <button className={styles.todayBtn} onClick={goToToday}>Today</button>
            </div>

            <div className={styles.grid}>
                {DAYS.map(day => (
                    <div key={day} className={styles.dayHeader}>{day}</div>
                ))}

                {/* Empty cells for days before the first day of the month */}
                {Array.from({ length: firstDayOfMonth }, (_, i) => (
                    <div key={`empty-${i}`} className={styles.dayCell}></div>
                ))}

                {/* Actual days of the month */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <div key={day} className={styles.dayCell}>
                        <span className={styles.dayNumber}>{day}</span>
                        <div className={styles.events}>
                            {renderEvent(day)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CalendarGrid;
