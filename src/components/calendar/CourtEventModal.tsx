"use client";

import { useState, useEffect } from 'react';
import { X, Calendar, MapPin, User, FileText, Gavel, Clock, Users, Check, Pencil, Loader } from 'lucide-react';
import styles from './EventModal.module.css';
import { CalendarEvent, LawyerSummary } from '@/types/legal';
import { updateCalendarEntry } from '@/app/actions/matters';
import { getLawyersForWorkspace } from '@/lib/briefs';

interface CourtEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: CalendarEvent;
    workspaceId: string;
    onUpdate?: (updatedEvent: Partial<CalendarEvent>) => void;
}

export default function CourtEventModal({ isOpen, onClose, event, workspaceId, onUpdate }: CourtEventModalProps) {
    const [appearances, setAppearances] = useState<LawyerSummary[]>(event.appearances ?? []);
    const [isEditingAppearances, setIsEditingAppearances] = useState(false);
    const [allLawyers, setAllLawyers] = useState<LawyerSummary[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingLawyers, setIsLoadingLawyers] = useState(false);

    // Reset state when event changes
    useEffect(() => {
        setAppearances(event.appearances ?? []);
        setIsEditingAppearances(false);
    }, [event.id]);

    const openEditMode = async () => {
        setIsLoadingLawyers(true);
        setIsEditingAppearances(true);
        setSelectedIds(new Set(appearances.map(a => a.id)));
        try {
            const lawyers = await getLawyersForWorkspace(workspaceId);
            setAllLawyers(lawyers as LawyerSummary[]);
        } catch (e) {
            console.error('Failed to load lawyers:', e);
        } finally {
            setIsLoadingLawyers(false);
        }
    };

    const toggleLawyer = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const saveAppearances = async () => {
        setIsSaving(true);
        try {
            const ids = Array.from(selectedIds);
            const result = await updateCalendarEntry(event.id, { appearingLawyerIds: ids });
            if (result.success) {
                const newAppearances = allLawyers.filter(l => ids.includes(l.id));
                setAppearances(newAppearances);
                onUpdate?.({ appearances: newAppearances });
                setIsEditingAppearances(false);
            }
        } finally {
            setIsSaving(false);
        }
    };

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
                                <label>Date &amp; Time</label>
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

                    {/* Appearing Counsel */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Users size={16} /> Appearing Counsel
                            </span>
                            {!isEditingAppearances && (
                                <button
                                    onClick={openEditMode}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                                >
                                    <Pencil size={13} /> Edit
                                </button>
                            )}
                        </h3>

                        {isEditingAppearances ? (
                            <div>
                                {isLoadingLawyers ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '8px 0' }}>
                                        <Loader size={14} className="animate-spin" /> Loading lawyers...
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '8px 0 12px' }}>
                                        {allLawyers.map(lawyer => (
                                            <button
                                                key={lawyer.id}
                                                onClick={() => toggleLawyer(lawyer.id)}
                                                style={{
                                                    padding: '5px 12px',
                                                    borderRadius: 20,
                                                    border: `1.5px solid ${selectedIds.has(lawyer.id) ? 'var(--primary)' : 'var(--border)'}`,
                                                    background: selectedIds.has(lawyer.id) ? 'var(--primary-soft, rgba(5,150,105,0.1))' : 'transparent',
                                                    color: selectedIds.has(lawyer.id) ? 'var(--primary)' : 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontWeight: selectedIds.has(lawyer.id) ? 600 : 400,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 5,
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                {selectedIds.has(lawyer.id) && <Check size={12} />}
                                                {lawyer.name || lawyer.email}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={saveAppearances}
                                        disabled={isSaving}
                                        style={{ padding: '6px 16px', borderRadius: 6, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                                    >
                                        {isSaving ? <><Loader size={12} className="animate-spin" /> Saving...</> : 'Save'}
                                    </button>
                                    <button
                                        onClick={() => setIsEditingAppearances(false)}
                                        disabled={isSaving}
                                        style={{ padding: '6px 16px', borderRadius: 6, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                                {appearances.length > 0 ? (
                                    appearances.map(lawyer => (
                                        <span key={lawyer.id} className={styles.participantBadge}>
                                            {lawyer.name || lawyer.email}
                                        </span>
                                    ))
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                        No counsel recorded — click Edit to add
                                    </p>
                                )}
                            </div>
                        )}
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
