"use client";

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Users, Gavel, Trash2 } from 'lucide-react';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import CourtEventModal from '@/components/calendar/CourtEventModal';
import MeetingEventModal from '@/components/calendar/MeetingEventModal';
import ScheduleMeetingModal from '@/components/calendar/ScheduleMeetingModal';
import AddMatterModal from '@/components/calendar/AddMatterModal';
import RecordProceedingModal from '@/components/calendar/RecordProceedingModal';
import DeletedEntriesModal from '@/components/calendar/DeletedEntriesModal';
import styles from './page.module.css';

import { CalendarEvent } from '@/types/legal';
import { getCalendarEvents } from '@/app/actions/calendar-events';

function getSystemRole(role: string): string {
    const r = role.toLowerCase();
    if (r.includes('managing partner')) return 'owner';
    if (r.includes('head of chambers') || r.includes('head of chamber')) return 'partner';
    if (r.includes('partner')) return 'partner';
    if (r.includes('manager') || r.includes('admin')) return 'admin';
    if (r.includes('associate')) return 'associate';
    return 'member';
}

interface CalendarClientProps {
    initialEvents: CalendarEvent[];
    workspaceId: string;
    userId: string;
    userRole: string;
    userEmail: string;
}

export default function CalendarClient({
    initialEvents,
    workspaceId,
    userId,
    userRole,
    userEmail,
}: CalendarClientProps) {
    const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(false);

    // Modals
    const [isAddMatterModalOpen, setIsAddMatterModalOpen] = useState(false);
    const [isScheduleMeetingModalOpen, setIsScheduleMeetingModalOpen] = useState(false);
    const [isRecordProceedingOpen, setIsRecordProceedingOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [isDeletedEntriesOpen, setIsDeletedEntriesOpen] = useState(false);

    const canViewDeleted = ['owner', 'admin'].includes(getSystemRole(userRole));

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

    const handleEventDeleted = (id: string) => {
        setEvents(prev => prev.filter(e => e.id !== id));
        setSelectedEvent(null);
    };

    return (
        <div className={styles.container}>
            <div className={styles.topToolbar}>
                <div className={styles.brand}>
                    <div>
                        <h1 className={styles.title}>Court and Meetings Tracker</h1>
                        <p className={styles.subtitle}>Track court dates, hearings, and internal meetings in one place.</p>
                    </div>
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
                        <button className={styles.secondaryBtn} onClick={() => setIsAddMatterModalOpen(true)}>
                            <Plus size={18} /> <span>Create New Matter</span>
                        </button>
                        <button className={styles.proceedingBtn} onClick={() => setIsRecordProceedingOpen(true)}>
                            <Gavel size={18} /> <span>Record Court Proceeding</span>
                        </button>
                        {canViewDeleted && (
                            <button
                                className={styles.secondaryBtn}
                                onClick={() => setIsDeletedEntriesOpen(true)}
                                style={{ color: '#dc2626', borderColor: '#dc2626' }}
                            >
                                <Trash2 size={18} /> <span>Deleted Entries</span>
                            </button>
                        )}
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

            <RecordProceedingModal
                isOpen={isRecordProceedingOpen}
                onClose={() => setIsRecordProceedingOpen(false)}
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

            {selectedEvent && (selectedEvent.type === 'COURT' || selectedEvent.type === 'COURT_DATE') && (
                <CourtEventModal
                    isOpen={!!selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    event={selectedEvent}
                    workspaceId={workspaceId}
                    userId={userId}
                    userRole={userRole}
                    userEmail={userEmail}
                    onUpdate={(patch) => {
                        setSelectedEvent(prev => prev ? { ...prev, ...patch } : prev);
                        setEvents(prev => prev.map(e => e.id === selectedEvent.id ? { ...e, ...patch } : e));
                    }}
                    onDelete={handleEventDeleted}
                />
            )}

            {selectedEvent && selectedEvent.type === 'MEETING' && (
                <MeetingEventModal
                    isOpen={!!selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    event={selectedEvent}
                    userId={userId}
                    userRole={userRole}
                    userEmail={userEmail}
                    onDelete={handleEventDeleted}
                />
            )}

            {canViewDeleted && (
                <DeletedEntriesModal
                    isOpen={isDeletedEntriesOpen}
                    onClose={() => setIsDeletedEntriesOpen(false)}
                    workspaceId={workspaceId}
                    onRestored={handleRefresh}
                />
            )}
        </div>
    );
}

