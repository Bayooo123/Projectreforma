'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './page.module.css';

type SessionState =
    | { status: 'loading' }
    | { status: 'ready'; entryUrl: string }
    | { status: 'error'; code: string; message: string };

export default function ChatView() {
    const [state, setState] = useState<SessionState>({ status: 'loading' });

    // TODO: Implement token refresh strategy.
    // The Magic Entry Token has a 60s TTL for initial entry; once the iframe is loaded,
    // the Bica session inside persists independently. If we need to handle session expiry
    // (e.g. after a long idle), decide here whether to refresh:
    //   - On a fixed timer (e.g. every N minutes)
    //   - After a postMessage event from the Fladov iframe signalling expiry
    //   - On user action (e.g. a "Reconnect" button)
    // For now, a single token is fetched on mount and the iframe is loaded once.
    const hasFetched = useRef(false);

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        async function generateSession() {
            try {
                const res = await fetch('/api/bica/sessions', { method: 'POST' });
                const body = await res.json();

                if (!res.ok || body.status === 'failed') {
                    const code: string = body?.error?.code ?? 'SESSION_ERROR';
                    const message: string = body?.error?.message ?? 'Unable to start a Bica session.';
                    console.error('[Bica /chat] Session generation failed', { code, message, status: res.status });
                    setState({ status: 'error', code, message });
                    return;
                }

                const entryUrl: string | undefined = body?.data?.entry_url;
                if (!entryUrl) {
                    console.error('[Bica /chat] No entry_url in response', body);
                    setState({ status: 'error', code: 'MISSING_ENTRY_URL', message: 'Bica returned no entry URL.' });
                    return;
                }

                setState({ status: 'ready', entryUrl });
            } catch (err: any) {
                console.error('[Bica /chat] Unexpected error during session generation', err);
                setState({
                    status: 'error',
                    code: 'CLIENT_ERROR',
                    message: err?.message ?? 'An unexpected error occurred.',
                });
            }
        }

        generateSession();
    }, []);

    if (state.status === 'loading') {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.skeleton} />
            </div>
        );
    }

    if (state.status === 'error') {
        return <BicaError code={state.code} message={state.message} />;
    }

    if (state.status === 'ready') {
        return (
            <iframe
                className={styles.iframe}
                src={state.entryUrl}
                allow="microphone; clipboard-write"
                referrerPolicy="origin"
                title="Reforma AI Assistant"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
            />
        );
    }

    return null;
}

// ---------------------------------------------------------------------------
// Error display — extensible skeleton for future error handling
// (e.g. reporting to Fladov, showing a support link, triggering an email)
// ---------------------------------------------------------------------------

interface BicaErrorProps {
    code: string;
    message: string;
}

function BicaError({ code, message }: BicaErrorProps) {
    // TODO: Add error reporting/notification logic here when needed.
    // Possible future hooks:
    //   - reportBicaError(code, message)       → POST to internal logging
    //   - notifyFladovSupport(code, message)   → email / webhook to Fladov
    //   - showSupportWidget()                  → open in-app support chat

    const isConfigError = code === 'SESSION_GENERATION_FAILED' || code === 'MISSING_ENTRY_URL';

    return (
        <div className={styles.errorContainer}>
            <div className={styles.errorCard}>
                <span className={styles.errorIcon}>⚠</span>
                <h2 className={styles.errorTitle}>
                    {isConfigError ? 'Could not connect to Reforma AI' : 'Something went wrong'}
                </h2>
                <p className={styles.errorMessage}>{message}</p>
                <p className={styles.errorCode}>{code}</p>
                <button
                    className={styles.retryButton}
                    onClick={() => window.location.reload()}
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
