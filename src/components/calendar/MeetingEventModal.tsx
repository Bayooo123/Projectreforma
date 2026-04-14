"use client";

import { X, Calendar, MapPin, Users, FileText, Clock } from 'lucide-react';
import styles from './EventModal.module.css';
import { CalendarEvent } from '@/types/legal';

interface MeetingEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: CalendarEvent;
}

export default function MeetingEventModal({ isOpen, onClose, event }: MeetingEventModalProps) {
    if (!isOpen) return null;

    const date = new Date(event.date);

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div className={styles.badge} style={{ backgroundColor: '#2563eb' }}>Meeting</div>
                    <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
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
