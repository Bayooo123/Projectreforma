import { useState, useEffect, useLayoutEffect } from 'react';

// useLayoutEffect fires before the browser paints — no desktop flash on mobile.
// Fall back to useEffect on the server (SSR) where window doesn't exist.
const useSyncEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useSyncEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    return isMobile;
}
