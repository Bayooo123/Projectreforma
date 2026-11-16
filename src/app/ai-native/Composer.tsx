'use client';

import { useState } from 'react';
import { Paperclip, MessageSquare, BookMarked } from 'lucide-react';
import styles from './page.module.css';

export default function Composer({
    value, onChange, onSend, mode, onMode, scopeLine, placeholder, busy, sendLabel, inputRef,
}: {
    value: string;
    onChange: (v: string) => void;
    onSend: () => void;
    mode: 'ask' | 'instruct';
    onMode: (m: 'ask' | 'instruct') => void;
    scopeLine: string;
    placeholder: string;
    busy: boolean;
    sendLabel: string;
    inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
    const [focused, setFocused] = useState(false);

    return (
        <div className={styles.composerWrap}>
            <div className={`${styles.composer} ${focused ? styles.composerFocused : ''}`}>
                <textarea
                    ref={inputRef}
                    className={styles.composerTextarea}
                    rows={2}
                    placeholder={placeholder}
                    value={value}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onChange={e => onChange(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                />
                <div className={styles.composerRow}>
                    <div className={styles.composerLeft}>
                        <span className={styles.attachIcon} title="Attach"><Paperclip size={15} /></span>
                        <div className={styles.modeToggle}>
                            <button type="button" className={`${styles.modeBtn} ${mode === 'ask' ? styles.modeBtnActive : ''}`} onClick={() => onMode('ask')}>
                                <MessageSquare size={13} />Ask
                            </button>
                            <button type="button" className={`${styles.modeBtn} ${mode === 'instruct' ? styles.modeBtnActive : ''}`} onClick={() => onMode('instruct')}>
                                <BookMarked size={13} />Instruct
                            </button>
                        </div>
                        <span className={styles.scopeLine}>{scopeLine}</span>
                    </div>
                    <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} disabled={busy || !value.trim()} onClick={onSend}>
                        {sendLabel}
                    </button>
                </div>
            </div>
            <div className={styles.composerHint}>Enter to send · Shift+Enter for a new line · Nothing leaves the firm until you approve it</div>
        </div>
    );
}
