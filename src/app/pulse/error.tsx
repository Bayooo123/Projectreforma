'use client';

export default function PulseError({ error, reset }: { error: Error; reset: () => void }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
            <p style={{ color: '#64748b', fontSize: 14 }}>Something went wrong loading The Pulse.</p>
            <button
                onClick={reset}
                style={{ padding: '8px 20px', background: '#064e3b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
            >
                Try again
            </button>
        </div>
    );
}
