'use client';

import { useRef, useState } from 'react';
import styles from './BicaWidget.module.css';

type PanelState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ready'; entryUrl: string }
    | { status: 'error'; message: string };

export default function BicaWidget() {
    const [open, setOpen] = useState(false);
    const [panel, setPanel] = useState<PanelState>({ status: 'idle' });
    const hasFetched = useRef(false);

    const openPanel = async () => {
        setOpen(true);

        // Only fetch the session once per mount
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

    return (
        <>
            {/* Panel — stays mounted once opened so the iframe session persists */}
            <div className={`${styles.panel} ${open ? styles.panelOpen : styles.panelClosed}`}>
                <div className={styles.header}>
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
            <button className={styles.toggle} onClick={toggle} title="Reforma AI Assistant">
                {open ? <XIcon /> : <BotIcon />}
            </button>
        </>
    );
}

function BotIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="8" width="18" height="12" rx="2" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            <circle cx="9" cy="14" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="15" cy="14" r="1.2" fill="currentColor" stroke="none" />
            <path d="M12 2v1" />
        </svg>
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
