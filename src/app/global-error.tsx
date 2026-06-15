'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
    return (
        <html>
            <body style={{ fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, background: '#f8fafc' }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', margin: 0 }}>Something went wrong</h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>An unexpected error occurred. Please try again.</p>
                <button
                    onClick={reset}
                    style={{ padding: '8px 20px', background: '#064e3b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', marginTop: 8 }}
                >
                    Reload
                </button>
            </body>
        </html>
    );
}
