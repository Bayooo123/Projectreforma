'use client';

import { useEffect, useState } from 'react';
import { setPracticeFocus, type PracticeFocus } from '@/app/actions/reforma-x';
import { Loader2 } from 'lucide-react';
import styles from '../x.module.css';

const OPTIONS: { value: PracticeFocus; title: string; body: string }[] = [
    {
        value: 'LITIGATION_HEAVY',
        title: 'Litigation heavy',
        body: 'Mostly court work — proceedings, filings, deadlines, client updates after every attendance.',
    },
    {
        value: 'ACADEMIC_CAPACITY_BUILDING',
        title: 'Academic work and capacity building',
        body: 'Research, training, publications, and developing talent alongside or instead of active litigation.',
    },
    {
        value: 'CORPORATE_ADVISORY',
        title: 'Corporate client advisory',
        body: 'Ongoing advisory work for corporate clients — contracts, compliance, transactions.',
    },
];

export default function OnboardingClient() {
    const [selected, setSelected] = useState<PracticeFocus | null>(null);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (done) window.location.href = '/ai-native';
    }, [done]);

    const choose = async (value: PracticeFocus) => {
        if (busy) return;
        setSelected(value);
        setBusy(true);
        const result = await setPracticeFocus(value);
        if (result.success) {
            setDone(true);
        } else {
            setBusy(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={`${styles.card} ${styles.onboardWrap}`}>
                <div className={styles.brand}>
                    <span className={styles.brandName}>Reforma</span>
                    <span className={styles.brandX}>X</span>
                </div>
                <h1 className={styles.title}>What describes your practice best?</h1>
                <p className={styles.subtitle}>One question — this shapes what Junior leads with for you.</p>

                <div className={styles.optionList}>
                    {OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            className={`${styles.optionCard} ${selected === opt.value ? styles.optionCardSelected : ''}`}
                            disabled={busy}
                            onClick={() => choose(opt.value)}
                        >
                            <span className={styles.optionTitle}>
                                {opt.title}
                                {busy && selected === opt.value && <Loader2 size={14} className={styles.spin} style={{ marginLeft: 8, display: 'inline-block', verticalAlign: 'middle' }} />}
                            </span>
                            <span className={styles.optionBody}>{opt.body}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
