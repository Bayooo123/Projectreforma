"use client";

import { useState, useEffect } from 'react';
import { X, Calendar, MapPin, User, FileText, Gavel, Clock, Users, Check, Pencil, Loader, Trash2 } from 'lucide-react';
import styles from './EventModal.module.css';
import { CalendarEvent, LawyerSummary } from '@/types/legal';
import { updateCalendarEntry } from '@/app/actions/matters';
import { deleteCalendarEntry } from '@/app/actions/calendar-events';
import { getLawyersForWorkspace } from '@/lib/briefs';
import LitigationTimeline from '@/components/matters/LitigationTimeline';

const SPECIAL_DELETE_EMAIL = 'bayo@abiolasanniandco.com';

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

interface CourtEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: CalendarEvent;
    workspaceId: string;
    userId: string;
    userRole: string;
    userEmail: string;
    isOwner: boolean;
    onUpdate?: (updatedEvent: Partial<CalendarEvent>) => void;
    onDelete?: (id: string) => void;
}

function toDatetimeLocal(date: Date | string): string {
    const d = new Date(date);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateInput(date: Date | string | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CourtEventModal({ isOpen, onClose, event, workspaceId, userId, userRole, userEmail, isOwner, onUpdate, onDelete }: CourtEventModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoadingLawyers, setIsLoadingLawyers] = useState(false);
    const [allLawyers, setAllLawyers] = useState<LawyerSummary[]>([]);
    const [appearances, setAppearances] = useState<LawyerSummary[]>(event.appearances ?? []);

    const systemRole = getSystemRole(userRole);
    const canDelete =
        isOwner ||
        ['owner', 'partner', 'admin'].includes(systemRole) ||
        (event.submittingLawyerId != null && event.submittingLawyerId === userId) ||
        userEmail === SPECIAL_DELETE_EMAIL;

    // Edit form state
    const [form, setForm] = useState({
        date: toDatetimeLocal(event.date),
        court: event.court ?? '',
        judge: event.judge ?? '',
        adjournedFor: event.adjournedFor ?? '',
        adjournedTo: toDateInput(event.adjournedTo),
        proceedings: event.proceedings ?? '',
        outcome: event.outcome ?? '',
    });
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(appearances.map(a => a.id)));

    useEffect(() => {
        setAppearances(event.appearances ?? []);
        setIsEditing(false);
        setForm({
            date: toDatetimeLocal(event.date),
            court: event.court ?? '',
            judge: event.judge ?? '',
            adjournedFor: event.adjournedFor ?? '',
            adjournedTo: toDateInput(event.adjournedTo),
            proceedings: event.proceedings ?? '',
            outcome: event.outcome ?? '',
        });
        setSelectedIds(new Set((event.appearances ?? []).map((a: LawyerSummary) => a.id)));
    }, [event.id]);

    const handleDelete = async () => {
        if (!confirm('Delete this calendar entry? This action can be reversed by IT Management.')) return;
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

    const openEdit = async () => {
        setIsEditing(true);
        if (allLawyers.length === 0) {
            setIsLoadingLawyers(true);
            try {
                const lawyers = await getLawyersForWorkspace(workspaceId);
                setAllLawyers(lawyers as LawyerSummary[]);
            } catch (e) {
                console.error('Failed to load lawyers:', e);
            } finally {
                setIsLoadingLawyers(false);
            }
        }
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setForm({
            date: toDatetimeLocal(event.date),
            court: event.court ?? '',
            judge: event.judge ?? '',
            adjournedFor: event.adjournedFor ?? '',
            adjournedTo: toDateInput(event.adjournedTo),
            proceedings: event.proceedings ?? '',
            outcome: event.outcome ?? '',
        });
        setSelectedIds(new Set(appearances.map(a => a.id)));
    };

    const save = async () => {
        setIsSaving(true);
        try {
            const result = await updateCalendarEntry(event.id, {
                date: form.date,
                court: form.court,
                judge: form.judge,
                adjournedFor: form.adjournedFor,
                adjournedTo: form.adjournedTo || null,
                proceedings: form.proceedings,
                outcome: form.outcome,
                appearingLawyerIds: Array.from(selectedIds),
            });
            if (result.success) {
                const newAppearances = allLawyers.filter(l => selectedIds.has(l.id));
                setAppearances(newAppearances.length ? newAppearances : appearances);
                onUpdate?.({
                    date: new Date(form.date),
                    court: form.court,
                    judge: form.judge,
                    adjournedFor: form.adjournedFor,
                    adjournedTo: form.adjournedTo ? new Date(form.adjournedTo) : undefined,
                    proceedings: form.proceedings,
                    outcome: form.outcome,
                    appearances: newAppearances,
                });
                setIsEditing(false);
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const date = new Date(event.date);
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '6px 8px', border: '1px solid #d1d5db',
        borderRadius: 6, fontSize: '0.875rem', fontFamily: 'inherit',
        background: '#fff', color: '#1e293b', outline: 'none',
    };
    const textareaStyle: React.CSSProperties = {
        ...inputStyle, resize: 'vertical', minHeight: 90,
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div className={styles.badge}>Court Date</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {!isEditing && (
                            <button
                                onClick={openEdit}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--primary)', background: 'none', border: '1px solid var(--primary)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 500 }}
                            >
                                <Pencil size={13} /> Edit
                            </button>
                        )}
                        {!isEditing && canDelete && (
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
                    <h2 className={styles.matterName}>{event.matter?.name || 'Untitled Matter'}</h2>
                    <p className={styles.caseNumber}>{event.matter?.caseNumber || 'N/A'}</p>

                    <div className={styles.metaGrid}>
                        {/* Date & Time */}
                        <div className={styles.metaItem}>
                            <Calendar size={16} />
                            <div style={{ flex: 1 }}>
                                <label>Date &amp; Time</label>
                                {isEditing ? (
                                    <input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
                                ) : (
                                    <p>{date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                                )}
                            </div>
                        </div>

                        {/* Court */}
                        <div className={styles.metaItem}>
                            <MapPin size={16} />
                            <div style={{ flex: 1 }}>
                                <label>Court</label>
                                {isEditing ? (
                                    <input type="text" value={form.court} onChange={e => setForm(f => ({ ...f, court: e.target.value }))} placeholder="e.g. High Court of Lagos" style={inputStyle} />
                                ) : (
                                    <p>{event.court || event.matter?.court || 'Not specified'}</p>
                                )}
                            </div>
                        </div>

                        {/* Judge */}
                        <div className={styles.metaItem}>
                            <User size={16} />
                            <div style={{ flex: 1 }}>
                                <label>Judge</label>
                                {isEditing ? (
                                    <input type="text" value={form.judge} onChange={e => setForm(f => ({ ...f, judge: e.target.value }))} placeholder="e.g. Justice Odusanya" style={inputStyle} />
                                ) : (
                                    <p>{event.judge || event.matter?.judge || '—'}</p>
                                )}
                            </div>
                        </div>

                        {/* Adjourned For */}
                        <div className={styles.metaItem}>
                            <Clock size={16} />
                            <div style={{ flex: 1 }}>
                                <label>Adjourned For</label>
                                {isEditing ? (
                                    <input type="text" value={form.adjournedFor} onChange={e => setForm(f => ({ ...f, adjournedFor: e.target.value }))} placeholder="e.g. Continuation of cross-examination" style={inputStyle} />
                                ) : (
                                    <p>{event.adjournedFor || 'Initial/General Hearing'}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Appearing Counsel */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Users size={16} /> Appearing Counsel
                        </h3>

                        {isEditing ? (
                            isLoadingLawyers ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '8px 0' }}>
                                    <Loader size={14} className="animate-spin" /> Loading lawyers...
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                                    {allLawyers.map(lawyer => (
                                        <button
                                            key={lawyer.id}
                                            onClick={() => setSelectedIds(prev => { const n = new Set(prev); n.has(lawyer.id) ? n.delete(lawyer.id) : n.add(lawyer.id); return n; })}
                                            style={{
                                                padding: '5px 12px', borderRadius: 20,
                                                border: `1.5px solid ${selectedIds.has(lawyer.id) ? 'var(--primary)' : 'var(--border)'}`,
                                                background: selectedIds.has(lawyer.id) ? 'var(--primary-soft, rgba(5,150,105,0.1))' : 'transparent',
                                                color: selectedIds.has(lawyer.id) ? 'var(--primary)' : 'var(--text-secondary)',
                                                cursor: 'pointer', fontSize: '0.8rem',
                                                fontWeight: selectedIds.has(lawyer.id) ? 600 : 400,
                                                display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
                                            }}
                                        >
                                            {selectedIds.has(lawyer.id) && <Check size={12} />}
                                            {lawyer.name || lawyer.email}
                                        </button>
                                    ))}
                                </div>
                            )
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

                    {/* Proceedings */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}><FileText size={16} /> Proceedings / Notes</h3>
                        {isEditing ? (
                            <textarea
                                value={form.proceedings}
                                onChange={e => setForm(f => ({ ...f, proceedings: e.target.value }))}
                                placeholder="Record what happened at this hearing..."
                                style={textareaStyle}
                            />
                        ) : (
                            <div className={styles.notesBox}>
                                {event.proceedings || 'No proceedings recorded for this date.'}
                            </div>
                        )}
                    </div>

                    {/* Outcome */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}><Gavel size={16} /> Outcome</h3>
                        {isEditing ? (
                            <textarea
                                value={form.outcome}
                                onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))}
                                placeholder="What was decided or ordered by the court..."
                                style={{ ...textareaStyle, minHeight: 60 }}
                            />
                        ) : (
                            <div className={styles.notesBox}>
                                {event.outcome || 'No outcome recorded.'}
                            </div>
                        )}
                    </div>

                    {/* Adjourned To */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}><Calendar size={16} /> Next Hearing Date</h3>
                        {isEditing ? (
                            <input
                                type="date"
                                value={form.adjournedTo}
                                onChange={e => setForm(f => ({ ...f, adjournedTo: e.target.value }))}
                                style={{ ...inputStyle, maxWidth: 220 }}
                            />
                        ) : (
                            event.adjournedTo ? (
                                <div className={styles.adjournedTo}>
                                    <Gavel size={16} />
                                    <span>Adjourned to: <strong>{new Date(event.adjournedTo).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>Not yet set</p>
                            )
                        )}
                    </div>

                    {event.matterId && <LitigationTimeline matterId={event.matterId} />}
                </div>

                <div className={styles.footer}>
                    {isEditing ? (
                        <>
                            <button
                                onClick={save}
                                disabled={isSaving}
                                className={styles.primaryBtn}
                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                {isSaving ? <><Loader size={14} className="animate-spin" /> Saving...</> : 'Save Changes'}
                            </button>
                            <button onClick={cancelEdit} disabled={isSaving} className={styles.secondaryBtn}>
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button onClick={onClose} className={styles.primaryBtn}>Close</button>
                    )}
                </div>
            </div>
        </div>
    );
}
