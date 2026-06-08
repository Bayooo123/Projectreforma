"use client";

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Gavel } from 'lucide-react';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import CourtEventModal from '@/components/calendar/CourtEventModal';
import MeetingEventModal from '@/components/calendar/MeetingEventModal';
import ScheduleMeetingModal from '@/components/calendar/ScheduleMeetingModal';
import AddMatterModal from '@/components/calendar/AddMatterModal';
import RecordProceedingModal from '@/components/calendar/RecordProceedingModal';
import styles from './page.module.css';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Icon } from '@/components/mobile/MobileShared';

import { CalendarEvent } from '@/types/legal';
import { getCalendarEvents } from '@/app/actions/calendar-events';

function getSystemRole(role: string): string {
    const r = role.toLowerCase();
    if (r.includes('owner')) return 'owner';
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
    isOwner: boolean;
}

export default function CalendarClient({
    initialEvents,
    workspaceId,
    userId,
    userRole,
    userEmail,
    isOwner,
}: CalendarClientProps) {
    const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(false);

    // Modals
    const [isAddMatterModalOpen, setIsAddMatterModalOpen] = useState(false);
    const [isScheduleMeetingModalOpen, setIsScheduleMeetingModalOpen] = useState(false);
    const [isRecordProceedingOpen, setIsRecordProceedingOpen] = useState(false);
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

    const handleEventDeleted = (id: string) => {
        setEvents(prev => prev.filter(e => e.id !== id));
        setSelectedEvent(null);
    };

    const isMobile = useIsMobile();

    if (isMobile) {
        // Sort events chronologically starting from today
        const sortedHearings = [...filteredEvents]
            .filter(e => e.type === 'COURT' || e.type === 'COURT_DATE')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const getEventDateInfo = (dateStr: string | Date) => {
            const d = new Date(dateStr);
            const day = d.getDate().toString().padStart(2, '0');
            const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
            return { day, month };
        };

        return (
            <div className="rm-screen">
                <div className="rm-scroll">
                    {/* Header */}
                    <div className="rm-hdr" style={{ borderBottom: '1px solid var(--rm-border)' }}>
                        <div className="rm-hdr-row" style={{ alignItems: 'center' }}>
                            <div>
                                <span className="rm-eyebrow">Calendar</span>
                                <h1 className="rm-h1">Court hearings</h1>
                            </div>
                            <button className="rm-icon-btn dark" onClick={() => setIsRecordProceedingOpen(true)}>
                                <Plus size={20} />
                            </button>
                        </div>

                        {/* Search bar */}
                        <div className="rm-search" style={{ margin: '14px 0 0' }}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search matters or courts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Hearing List */}
                    <div className="rm-sec-label">
                        <span className="t">Upcoming Hearings ({sortedHearings.length})</span>
                    </div>
                    <div className="rm-list">
                        {sortedHearings.map(event => {
                            const { day, month } = getEventDateInfo(event.date);
                            return (
                                <div
                                    key={event.id}
                                    className="rm-hear"
                                    onClick={() => handleEventClick(event)}
                                >
                                    <div className="when-box">
                                        <span className="d">{day}</span>
                                        <span className="mo">{month}</span>
                                    </div>
                                    <div className="mid">
                                        <div className="nm">{event.title || event.matter?.name || 'Hearing'}</div>
                                        <div className="cn">{event.matter?.caseNumber || 'No case number'}</div>
                                        <div className="cr">
                                            <Icon n="building" s={13} c="#94A3B8" />
                                            <span>{event.court || 'Courtroom not specified'}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <Icon n="chevR" s={16} c="#94A3B8" />
                                    </div>
                                </div>
                            );
                        })}

                        {sortedHearings.length === 0 && (
                            <div className="rm-empty">
                                <Icon n="cal" s={32} c="#94A3B8" />
                                <p>No upcoming court hearings scheduled</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Floating CTA fixed at bottom */}
                <div className="rm-cta-fixed">
                    <button className="rm-btn-primary" onClick={() => setIsRecordProceedingOpen(true)}>
                        <Icon n="gavel" s={18} />
                        Record Court Proceeding
                    </button>
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
                        isOwner={isOwner}
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
                        isOwner={isOwner}
                        onDelete={handleEventDeleted}
                    />
                )}
            </div>
        );
    }

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
                            <strong>{filteredEvents.filter(e => e.type === 'COURT').length}</strong> <span>Court Appearances</span>
                        </div>
                        <div className={styles.statItem}>
                            <strong>{filteredEvents.filter(e => e.type === 'MEETING').length}</strong> <span>Work Meetings</span>
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
                    isOwner={isOwner}
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
                    isOwner={isOwner}
                    onDelete={handleEventDeleted}
                />
            )}

        </div>
    );
}

