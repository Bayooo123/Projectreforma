"use client";

import { useState, useEffect, useCallback } from 'react';
import { Plus, Gavel, Search, Calendar as CalendarIcon, Filter, Users, Loader } from 'lucide-react';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import CourtEventModal from '@/components/calendar/CourtEventModal';
import MeetingEventModal from '@/components/calendar/MeetingEventModal';
import ScheduleMeetingModal from '@/components/calendar/ScheduleMeetingModal';
import AddMatterModal from '@/components/calendar/AddMatterModal';
import styles from './page.module.css';

import { CalendarEvent, Matter } from '@/types/legal';
import { getCalendarEvents } from '@/app/actions/calendar-events';

interface CalendarClientProps {
    initialEvents: CalendarEvent[];
    workspaceId: string;
    userId: string;
}

export default function CalendarClient({
    initialEvents,
    workspaceId,
    userId,
}: CalendarClientProps) {
    const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(false);

    // Modals
    const [isAddMatterModalOpen, setIsAddMatterModalOpen] = useState(false);
    const [isScheduleMeetingModalOpen, setIsScheduleMeetingModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');

    const fetchEvents = useCallback(async (date: Date) => {
        setIsLoading(true);
        try {
            // Calculate month range for lazy loading
            const start = new Date(date.getFullYear(), date.getMonth(), 1);
            const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
            
            const fetched = await getCalendarEvents(workspaceId, start, end);
            setEvents(fetched as unknown as CalendarEvent[]);
        } catch (error) {
            console.error('Failed to fetch events:', error);
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    // Fetch events when month changes
    useEffect(() => {
        fetchEvents(currentDate);
    }, [currentDate, fetchEvents]);

    const handleDateChange = (newDate: Date) => {
        // If current month/year is different, it triggers fetch via useEffect
        setCurrentDate(newDate);
    };

    const handleEventClick = (event: CalendarEvent) => {
        setSelectedEvent(event);
    };

    const filteredEvents = events.filter(event => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            event.matter?.name?.toLowerCase().includes(query) ||
            event.matter?.caseNumber?.toLowerCase().includes(query) ||
            event.title?.toLowerCase().includes(query) ||
            event.court?.toLowerCase().includes(query)
        );
    });

    const handleRefresh = () => fetchEvents(currentDate);

    return (
        <div className={styles.container}>
            <div className={styles.topToolbar}>
                <div className={styles.brand}>
                    <h1 className={styles.title}>Legal Calendar</h1>
                    <div className={styles.stats}>
                        <div className={styles.statItem}>
                            <strong>{filteredEvents.filter(e => e.type === 'COURT').length}</strong> <span>Courts</span>
                        </div>
                        <div className={styles.statItem}>
                            <strong>{filteredEvents.filter(e => e.type === 'MEETING').length}</strong> <span>Meetings</span>
                        </div>
                    </div>
                </div>

                <div className={styles.toolbarActions}>
                    <div className={styles.searchBox}>
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Find matter, court or meeting..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className={styles.buttonGroup}>
                        <button className={styles.primaryBtn} onClick={() => setIsAddMatterModalOpen(true)}>
                            <Plus size={18} /> <span>New Court Date</span>
                        </button>
                        <button className={styles.secondaryBtn} onClick={() => setIsScheduleMeetingModalOpen(true)}>
                            <Users size={18} /> <span>Schedule Meeting</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.calendarGrid}>
                <CalendarGrid
                    events={filteredEvents}
                    currentDate={currentDate}
                    onDateChange={handleDateChange}
                    onEventClick={handleEventClick}
                    isLoading={isLoading}
                />
            </div>

            {/* Modals */}
            <AddMatterModal
                isOpen={isAddMatterModalOpen}
                onClose={() => setIsAddMatterModalOpen(false)}
                workspaceId={workspaceId}
                userId={userId}
                onSuccess={handleRefresh}
            />

            <ScheduleMeetingModal
                isOpen={isScheduleMeetingModalOpen}
                onClose={() => setIsScheduleMeetingModalOpen(false)}
                workspaceId={workspaceId}
                userId={userId}
                onSuccess={handleRefresh}
            />

            {selectedEvent && selectedEvent.type === 'COURT' && (
                <CourtEventModal 
                    isOpen={!!selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    event={selectedEvent}
                />
            )}

            {selectedEvent && selectedEvent.type === 'MEETING' && (
                <MeetingEventModal 
                    isOpen={!!selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    event={selectedEvent}
                />
            )}
        </div>
    );
}

