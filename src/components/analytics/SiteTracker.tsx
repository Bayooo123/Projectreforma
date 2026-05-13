'use client';

import { useEffect } from 'react';

function getOrCreateSessionId(): string {
    try {
        let sid = localStorage.getItem('_rsid');
        if (!sid) {
            sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
            localStorage.setItem('_rsid', sid);
        }
        return sid;
    } catch {
        return Math.random().toString(36).slice(2);
    }
}

export default function SiteTracker({ page = '/' }: { page?: string }) {
    useEffect(() => {
        const sessionId = getOrCreateSessionId();
        const referrer = document.referrer || null;

        fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page, sessionId, referrer }),
        }).catch(() => {});
    }, [page]);

    return null;
}
