'use client';

import { useState, useCallback } from 'react';
import { Mic, Users, FileAudio, X } from 'lucide-react';
import MeetingRecorder from '@/components/calendar/MeetingRecorder';
import { getWorkspaceRecordings, type MeetingRecordingRow } from '@/app/actions/meeting-recordings';
import { getBriefsForPicker } from '@/app/actions/briefs';
import { formatMeetingDate, transcriptBadge } from '@/lib/meetings/format';

interface BriefOption {
    id: string;
    name: string;
    briefNumber: string;
}

type Mode = 'idle' | 'general' | 'brief-pick' | 'brief-record';

const primaryBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '0.55rem 1.1rem',
    borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff',
    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
};

const secondaryBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '0.55rem 1.1rem',
    borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151',
    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
};

const panelStyle: React.CSSProperties = {
    border: '1px solid #e5e7eb', borderRadius: 12, padding: '1rem', marginBottom: '1.5rem', background: '#fff',
};

const panelHeaderStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem',
};

const closeBtn: React.CSSProperties = {
    border: 'none', background: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex', padding: 2,
};

const selectStyle: React.CSSProperties = {
    width: '100%', padding: '0.55rem 0.7rem', borderRadius: 8, border: '1px solid #e5e7eb',
    fontSize: '0.85rem', color: '#111827', background: '#fff', marginBottom: '0.75rem',
};

const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap',
    padding: '0.7rem 0.85rem', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff',
};

export default function RecordingsClient({
    initialRecordings, workspaceId,
}: { initialRecordings: MeetingRecordingRow[]; workspaceId: string }) {
    const [feed, setFeed] = useState(initialRecordings);
    const [mode, setMode] = useState<Mode>('idle');
    const [briefs, setBriefs] = useState<BriefOption[] | null>(null);
    const [selectedBriefId, setSelectedBriefId] = useState('');

    const refreshFeed = useCallback(() => {
        getWorkspaceRecordings(workspaceId).then(setFeed);
    }, [workspaceId]);

    const openBriefPicker = () => {
        setMode('brief-pick');
        setSelectedBriefId('');
        if (!briefs) {
            getBriefsForPicker(workspaceId).then(list =>
                setBriefs(list.map(b => ({ id: b.id, name: b.name, briefNumber: b.briefNumber })))
            );
        }
    };

    const closeToIdle = () => {
        setMode('idle');
        setSelectedBriefId('');
    };

    const selectedBrief = briefs?.find(b => b.id === selectedBriefId);

    return (
        <div style={{ padding: '1.5rem', maxWidth: 900, margin: '0 auto' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: 0 }}>Recordings</h1>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '4px 0 0' }}>
                    Record meetings day to day, or against a specific brief. Every recording is transcribed automatically.
                </p>
            </div>

            {mode === 'idle' && (
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <button onClick={() => setMode('general')} style={primaryBtn}>
                        <Mic size={15} /> Record now
                    </button>
                    <button onClick={openBriefPicker} style={secondaryBtn}>
                        <Users size={15} /> Record for a brief
                    </button>
                </div>
            )}

            {mode === 'general' && (
                <div style={panelStyle}>
                    <div style={panelHeaderStyle}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>General recording</span>
                        <button onClick={closeToIdle} style={closeBtn}><X size={16} /></button>
                    </div>
                    <MeetingRecorder scope={{ workspaceId }} onSaved={refreshFeed} />
                </div>
            )}

            {mode === 'brief-pick' && (
                <div style={panelStyle}>
                    <div style={panelHeaderStyle}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>Record for a brief</span>
                        <button onClick={closeToIdle} style={closeBtn}><X size={16} /></button>
                    </div>
                    <select value={selectedBriefId} onChange={e => setSelectedBriefId(e.target.value)} style={selectStyle}>
                        <option value="">Select a brief…</option>
                        {briefs?.map(b => (
                            <option key={b.id} value={b.id}>{b.name} ({b.briefNumber})</option>
                        ))}
                    </select>
                    <button
                        disabled={!selectedBriefId}
                        onClick={() => setMode('brief-record')}
                        style={{ ...primaryBtn, opacity: selectedBriefId ? 1 : 0.5, cursor: selectedBriefId ? 'pointer' : 'default' }}
                    >
                        <Mic size={14} /> Start recording
                    </button>
                </div>
            )}

            {mode === 'brief-record' && selectedBrief && (
                <div style={panelStyle}>
                    <div style={panelHeaderStyle}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>
                            {selectedBrief.name} ({selectedBrief.briefNumber})
                        </span>
                        <button onClick={closeToIdle} style={closeBtn}><X size={16} /></button>
                    </div>
                    <MeetingRecorder scope={{ workspaceId, briefId: selectedBrief.id }} onSaved={refreshFeed} />
                </div>
            )}

            <div>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', margin: '0 0 0.75rem' }}>All recordings</h2>
                {feed.length === 0 && <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>No recordings yet.</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {feed.map(r => {
                        const badge = transcriptBadge(r.transcriptStatus);
                        return (
                            <div key={r.id} style={rowStyle}>
                                <FileAudio size={16} color="#6b7280" />
                                <div style={{ flex: '1 1 220px', minWidth: 200 }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>
                                        {r.briefName ? `${r.briefName} (${r.briefNumber})` : (r.title || 'General recording')}
                                    </div>
                                    <audio controls src={r.audioUrl} style={{ height: 30, marginTop: 4, width: '100%', maxWidth: 320 }} />
                                </div>
                                <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{formatMeetingDate(r.createdAt)}</span>
                                <span style={{
                                    fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                                    padding: '2px 8px', borderRadius: 999, background: badge.bg, color: badge.fg,
                                }}>
                                    {badge.label}
                                </span>
                                {r.transcriptText && (
                                    <p style={{ width: '100%', fontSize: '0.75rem', color: '#374151', lineHeight: 1.5, margin: '0.3rem 0 0' }}>
                                        {r.transcriptText}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
