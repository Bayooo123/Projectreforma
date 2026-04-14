"use client";

import { X, Calendar, MapPin, User, FileText, Gavel, Clock } from 'lucide-react';
import styles from './EventModal.module.css';
import { CalendarEvent } from '@/types/legal';

interface CourtEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: CalendarEvent;
}

export default function CourtEventModal({ isOpen, onClose, event }: CourtEventModalProps) {
    if (!isOpen) return null;

    const date = new Date(event.date);

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div className={styles.badge}>Court Date</div>
                    <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
                </div>

                <div className={styles.content}>
                    <h2 className={styles.matterName}>{event.matter?.name || 'Untitled Matter'}</h2>
                    <p className={styles.caseNumber}>{event.matter?.caseNumber || 'N/A'}</p>

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
                                <label>Court</label>
                                <p>{event.court || event.matter?.court || 'Not specified'}</p>
                            </div>
                        </div>
                        <div className={styles.metaItem}>
                            <User size={16} />
                            <div>
                                <label>Judge</label>
                                <p>{event.judge || event.matter?.judge || '—'}</p>
                            </div>
                        </div>
                        <div className={styles.metaItem}>
                            <Clock size={16} />
                            <div>
                                <label>Adjourned For</label>
                                <p>{event.adjournedFor || 'Initial/General Hearing'}</p>
                            </div>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}><FileText size={16} /> Proceedings / Notes</h3>
                        <div className={styles.notesBox}>
                            {event.proceedings || 'No proceedings recorded for this date.'}
                        </div>
                    </div>

                    {event.adjournedTo && (
                        <div className={styles.adjournedTo}>
                            <Gavel size={16} />
                            <span>Adjourned to: <strong>{new Date(event.adjournedTo).toLocaleDateString()}</strong></span>
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.primaryBtn}>Close</button>
                </div>
            </div>
        </div>
    );
}
