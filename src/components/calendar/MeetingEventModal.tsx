"use client";

import { useState } from 'react';
import { X, Calendar, MapPin, Users, FileText, Loader, Trash2 } from 'lucide-react';
import styles from './EventModal.module.css';
import { CalendarEvent } from '@/types/legal';
import { deleteCalendarEntry } from '@/app/actions/calendar-events';

const SPECIAL_DELETE_EMAIL = 'bayo@abiolasanniandco.com';

function getSystemRole(role: string): string {
    const r = role.toLowerCase();
    if (r.includes('managing partner')) return 'owner';
    if (r.includes('head of chambers') || r.includes('head of chamber')) return 'partner';
    if (r.includes('partner')) return 'partner';
    if (r.includes('manager') || r.includes('admin')) return 'admin';
    if (r.includes('associate')) return 'associate';
    return 'member';
}

interface MeetingEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: CalendarEvent;
    userId: string;
    userRole: string;
    userEmail: string;
    onDelete?: (id: string) => void;
}

export default function MeetingEventModal({ isOpen, onClose, event, userId, userRole, userEmail, onDelete }: MeetingEventModalProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const systemRole = getSystemRole(userRole);
    const canDelete =
        ['owner', 'partner', 'admin'].includes(systemRole) ||
        (event.submittingLawyerId != null && event.submittingLawyerId === userId) ||
        userEmail === SPECIAL_DELETE_EMAIL;

    const handleDelete = async () => {
        if (!confirm('Delete this meeting entry? This action can be reversed by IT Management.')) return;
        setIsDeleting(true);
        try {
            const result = await deleteCalendarEntry(event.id);
            if (result.success) {
                onDelete?.(event.id);
            } else {
                alert(result.error || 'Failed to delete entry');
            }
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isOpen) return null;

    const date = new Date(event.date);

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div className={styles.badge} style={{ backgroundColor: '#2563eb' }}>Meeting</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {canDelete && (
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: '#dc2626', background: 'none', border: '1px solid #dc2626', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 500, opacity: isDeleting ? 0.6 : 1 }}
                            >
                                {isDeleting ? <Loader size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        )}
                        <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
                    </div>
                </div>

                <div className={styles.content}>
                    <h2 className={styles.matterName}>{event.title || event.matter?.name || 'Untitled Meeting'}</h2>
                    {event.matter && <p className={styles.caseNumber}>{event.matter.name} ({event.matter.caseNumber})</p>}

                    <div className={styles.metaGrid}>
                        <div className={styles.metaItem}>
                            <Calendar size={16} />
                            <div>
                                <label>Date & Time</label>
                                <p>{date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                            </div>
                        </div>
                        <div className={styles.metaItem}>
                            <MapPin size={16} />
                            <div>
                                <label>Location</label>
                                <p>{event.location || 'Not specified'}</p>
                            </div>
                        </div>
                        <div className={styles.metaItem}>
                            <Users size={16} />
                            <div>
                                <label>Participants</label>
                                <div className={styles.participantsList}>
                                    {event.appearances && event.appearances.length > 0 ? (
                                        event.appearances.map(p => (
                                            <span key={p.id} className={styles.participantBadge}>{p.name}</span>
                                        ))
                                    ) : (
                                        <p>No participants recorded</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}><FileText size={16} /> Agenda / Notes</h3>
                        <div className={styles.notesBox}>
                            {event.agenda || event.description || event.proceedings || 'No notes available.'}
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.primaryBtn}>Close</button>
                </div>
            </div>
        </div>
    );
}
