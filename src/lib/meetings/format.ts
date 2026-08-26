export function formatMeetingDuration(totalSeconds: number | null): string {
    if (totalSeconds == null) return '';
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatMeetingDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
        ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function transcriptBadge(status: string): { label: string; bg: string; fg: string } {
    if (status === 'completed') return { label: 'Transcribed', bg: '#ecfdf5', fg: '#047857' };
    if (status === 'failed') return { label: 'Transcription failed', bg: '#fef2f2', fg: '#b91c1c' };
    if (status === 'processing') return { label: 'Transcribing…', bg: '#eff6ff', fg: '#1d4ed8' };
    return { label: 'Transcript pending', bg: '#f3f4f6', fg: '#6b7280' };
}
