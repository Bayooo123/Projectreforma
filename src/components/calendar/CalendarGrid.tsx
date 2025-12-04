"use client";

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Gavel, Loader } from 'lucide-react';
import styles from './CalendarGrid.module.css';

interface Matter {
    id: string;
    caseNumber: string;
    name: string;
    clientId: string;
    assignedLawyerId: string;
    workspaceId: string;
    court: string | null;
    judge: string | null;
    status: string;
    nextCourtDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    client: {
        id: string;
        name: string;
    };
    assignedLawyer: {
        id: string;
        name: string | null;
    };
}

interface CalendarGridProps {
    matters: Matter[];
    currentDate: Date;
    onDateChange: (date: Date) => void;
    onEventClick: (matter: Matter) => void;
    isLoading?: boolean;
}

const CalendarGrid = ({
    matters,
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

    // Group matters by day of month
    const mattersByDay: Record<number, Matter[]> = {};
    matters.forEach(matter => {
        if (matter.nextCourtDate) {
            const courtDate = new Date(matter.nextCourtDate);
            const day = courtDate.getDate();
            if (!mattersByDay[day]) {
                mattersByDay[day] = [];
            }
            mattersByDay[day].push(matter);
        }
    });

    const renderEvent = (day: number) => {
        const dayMatters = mattersByDay[day];
        if (!dayMatters || dayMatters.length === 0) return null;

        return dayMatters.map((matter) => (
            <div
                key={matter.id}
                className={styles.caseItem}
                onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(matter);
                }}
                style={{ cursor: 'pointer' }}
            >
                <Gavel size={10} className={styles.caseIcon} />
                <span className={styles.caseName}>{matter.name}</span>
            </div>
        ));
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
                                {renderEvent(day)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CalendarGrid;
