'use client';

import { useCallback, useRef, useState } from 'react';
import styles from './BicaWidget.module.css';

type PanelState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ready'; entryUrl: string }
    | { status: 'error'; message: string };

interface Position {
    bottom: number;
    left: number;
}

const DEFAULT_POS: Position = { bottom: 84, left: 24 };
const TOGGLE_OFFSET = 60; // px between toggle button bottom and panel bottom

export default function BicaWidget() {
    const [open, setOpen] = useState(false);
    const [panel, setPanel] = useState<PanelState>({ status: 'idle' });
    const [pos, setPos] = useState<Position>(DEFAULT_POS);
    const hasFetched = useRef(false);
    const dragState = useRef<{ startX: number; startY: number; startLeft: number; startBottom: number } | null>(null);

    const openPanel = async () => {
        setOpen(true);

        if (hasFetched.current) return;
        hasFetched.current = true;

        setPanel({ status: 'loading' });
        try {
            const res = await fetch('/api/bica/sessions', { method: 'POST' });
            const body = await res.json();

            if (!res.ok || body.status === 'failed') {
                setPanel({ status: 'error', message: body?.error?.message ?? 'Could not start session.' });
                return;
            }

            const entryUrl: string | undefined = body?.data?.entry_url;
            if (!entryUrl) {
                setPanel({ status: 'error', message: 'No entry URL returned.' });
                return;
            }

            setPanel({ status: 'ready', entryUrl });
        } catch (err: any) {
            setPanel({ status: 'error', message: err?.message ?? 'Unexpected error.' });
        }
    };

    const retry = () => {
        hasFetched.current = false;
        setPanel({ status: 'idle' });
        openPanel();
    };

    const toggle = () => {
        if (!open) {
            openPanel();
        } else {
            setOpen(false);
        }
    };

    // ── Drag handlers ────────────────────────────────────────────────────────

    const onDragMove = useCallback((e: PointerEvent) => {
        if (!dragState.current) return;
        const dx = e.clientX - dragState.current.startX;
        const dy = e.clientY - dragState.current.startY;
        const newLeft = Math.max(0, dragState.current.startLeft + dx);
        const newBottom = Math.max(0, dragState.current.startBottom - dy);
        setPos({ left: newLeft, bottom: newBottom });
    }, []);

    const onDragEnd = useCallback(() => {
        dragState.current = null;
        window.removeEventListener('pointermove', onDragMove);
        window.removeEventListener('pointerup', onDragEnd);
    }, [onDragMove]);

    const onDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
        // Only drag on the header itself, not buttons inside it
        if ((e.target as HTMLElement).closest('button')) return;
        dragState.current = {
            startX: e.clientX,
            startY: e.clientY,
            startLeft: pos.left,
            startBottom: pos.bottom,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        window.addEventListener('pointermove', onDragMove);
        window.addEventListener('pointerup', onDragEnd);
    };

    const togglePos: Position = { bottom: pos.bottom - TOGGLE_OFFSET, left: pos.left };

    return (
        <>
            {/* Panel — stays mounted once opened so the iframe session persists */}
            <div
                className={`${styles.panel} ${open ? styles.panelOpen : styles.panelClosed}`}
                style={{ bottom: pos.bottom, left: pos.left }}
            >
                <div
                    className={styles.header}
                    onPointerDown={onDragStart}
                    style={{ cursor: 'grab' }}
                >
                    <div className={styles.headerLeft}>
                        <span className={styles.headerDot} />
                        <span className={styles.headerTitle}>Reforma AI</span>
                    </div>
                    <div className={styles.headerActions}>
                        <button
                            className={styles.iconBtn}
                            onClick={() => setOpen(false)}
                            title="Minimise"
                        >
                            <MinusIcon />
                        </button>
                        <button
                            className={styles.iconBtn}
                            onClick={() => { setOpen(false); hasFetched.current = false; setPanel({ status: 'idle' }); }}
                            title="Close"
                        >
                            <XIcon />
                        </button>
                    </div>
                </div>

                <div className={styles.body}>
                    {panel.status === 'idle' && null}

                    {panel.status === 'loading' && (
                        <div className={styles.loader}>
                            <div className={styles.spinner} />
                            <p className={styles.loaderText}>Connecting…</p>
                        </div>
                    )}

                    {panel.status === 'error' && (
                        <div className={styles.errorState}>
                            <p className={styles.errorTitle}>Could not connect</p>
                            <p className={styles.errorMsg}>{panel.message}</p>
                            <button className={styles.retryBtn} onClick={retry}>Try again</button>
                        </div>
                    )}

                    {panel.status === 'ready' && (
                        <iframe
                            className={styles.iframe}
                            src={panel.entryUrl}
                            title="Reforma AI"
                            allow="microphone; clipboard-write"
                            referrerPolicy="origin"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
                        />
                    )}
                </div>
            </div>

            {/* Floating toggle button */}
            <button
                className={styles.toggle}
                onClick={toggle}
                title="Reforma AI Assistant"
                style={{ bottom: togglePos.bottom, left: togglePos.left }}
            >
                {open
                    ? <XIcon />
                    : <img src="/logos/reforma-logo-monogram.png" alt="Reforma AI" className={styles.toggleLogo} />
                }
            </button>
        </>
    );
}

function XIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
        </svg>
    );
}

function MinusIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
        </svg>
    );
}
