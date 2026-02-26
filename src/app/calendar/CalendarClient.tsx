"use client";

import { useState, useEffect } from 'react';
import { Plus, Gavel } from 'lucide-react';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import MatterDetailModal from '@/components/calendar/MatterDetailModal';
import ScheduleMeetingModal from '@/components/calendar/ScheduleMeetingModal';
import RecordMeetingModal from '@/components/calendar/RecordMeetingModal';
import { getMattersForMonth } from '@/lib/matters';
import styles from './page.module.css';

import { CalendarEvent, CalendarEventType } from '@/components/calendar/CalendarGrid';

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

    // Sync state with props when revalidation occurs
    useEffect(() => {
        setEvents(initialEvents);
    }, [initialEvents]);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isScheduleMeetingModalOpen, setIsScheduleMeetingModalOpen] = useState(false);
    const [isRecordMeetingModalOpen, setIsRecordMeetingMeetingModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const [selectedMatter, setSelectedMatter] = useState<any | null>(null);
    const [isLoadingMonth, setIsLoadingMonth] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<CalendarEventType | 'ALL'>('ALL');
    const [filterCategory, setFilterCategory] = useState<'UPCOMING' | 'PAST' | 'ALL'>('ALL');

    // ... (keep filtering logic)
    // Unified Filtering Logic
    const filteredEvents = events.filter(event => {
        const queryMatch = !searchQuery || (
            event.matter?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.matter?.caseNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.title?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const typeMatch = filterType === 'ALL' || event.type === filterType;

        const isPast = new Date(event.date) < new Date();
        const categoryMatch = filterCategory === 'ALL' ||
            (filterCategory === 'UPCOMING' && !isPast) ||
            (filterCategory === 'PAST' && isPast);

        return queryMatch && typeMatch && categoryMatch;
    });

    // ... (keep refreshEvents)
    const refreshEvents = async () => {
        console.log('Refreshing events...'); // Debug log
        try {
            const { getCalendarEvents } = await import('@/app/actions/calendar-events');
            const newEvents = await getCalendarEvents(workspaceId);
            setEvents(newEvents);
        } catch (e) {
            console.error(e);
        }
    };

    // ... (keep handleEventClick, handleDetailClose)
    const handleEventClick = async (event: CalendarEvent) => {
        // Instant feedback: Open modal with data we already have
        setSelectedMatter({
            ...event.matter,
            workspaceId: workspaceId, // Ensure workspaceId is passed for lawyer fetching
            briefs: [],
            calendarEntries: [],
            status: 'active', // Fallback status
            nextCourtDate: event.date,
            court: null,
            judge: null,
        });
        setIsDetailModalOpen(true);

        // Fetch full-fidelity details in background
        if (event.matterId) {
            try {
                const { getMatterById } = await import('@/app/actions/matters');
                const fullMatter = await getMatterById(event.matterId);
                if (fullMatter) {
                    setSelectedMatter(fullMatter as any);
                }
            } catch (e) {
                console.error('Background fetch failed:', e);
            }
        }
    };

    const handleDetailClose = () => {
        setIsDetailModalOpen(false);
        setSelectedMatter(null);
        refreshEvents();
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Legal Calendar</h1>
                    <p className={styles.subtitle}>Unified practice scheduling & documentation</p>
                </div>
                <div className={styles.headerActions}>
                    <div className={styles.filtersWrapper}>
                        <select
                            className={styles.selectFilter}
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as any)}
                        >
                            <option value="ALL">All Event Types</option>
                            <option value="COURT_DATE">Court Dates</option>
                            <option value="FILING_DEADLINE">FILING_DEADLINE</option>
                            <option value="CLIENT_MEETING">Client Meetings</option>
                            <option value="INTERNAL_MEETING">Internal Meetings</option>
                        </select>

                        <select
                            className={styles.selectFilter}
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value as any)}
                        >
                            <option value="ALL">All Dates</option>
                            <option value="UPCOMING">Upcoming</option>
                            <option value="PAST">Past</option>
                        </select>
                    </div>

                    <div className={styles.searchWrapper}>
                        <input
                            type="text"
                            placeholder="Search calendar..."
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className={styles.actionButtons}>
                        <button
                            className={styles.btnSecondary}
                            onClick={() => setIsScheduleMeetingModalOpen(true)}
                        >
                            <Plus size={18} />
                            <span>Schedule Meeting</span>
                        </button>

                        <button
                            className={styles.btnPrimary}
                            onClick={() => setIsRecordMeetingMeetingModalOpen(true)}
                        >
                            <Gavel size={18} />
                            <span>Record Meeting</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.calendarSection}>
                <CalendarGrid
                    events={filteredEvents}
                    currentDate={currentDate}
                    onDateChange={setCurrentDate}
                    onEventClick={handleEventClick}
                    isLoading={isLoadingMonth}
                />
            </div>

            {/* TODO: Implement ScheduleMeetingModal and RecordMeetingModal */}
            <AddMatterModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                workspaceId={workspaceId}
                userId={userId}
                onSuccess={refreshEvents}
            />

            <ScheduleMeetingModal
                isOpen={isScheduleMeetingModalOpen}
                onClose={() => setIsScheduleMeetingModalOpen(false)}
                workspaceId={workspaceId}
                userId={userId}
                onSuccess={refreshEvents}
            />

            <RecordMeetingModal
                isOpen={isRecordMeetingModalOpen}
                onClose={() => setIsRecordMeetingMeetingModalOpen(false)}
                workspaceId={workspaceId}
                userId={userId}
                onSuccess={refreshEvents}
            />

            {selectedMatter && (
                <MatterDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={handleDetailClose}
                    matter={selectedMatter}
                    userId={userId}
                />
            )}
        </div>
    );
}
