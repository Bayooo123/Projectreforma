'use client';

import { Suspense, useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { updatePassword } from '../../actions/reset-password';
import styles from '../auth.module.css';

function ResetPasswordForm() {
    const token = useSearchParams().get('token');
    const [state, formAction, pending] = useActionState(updatePassword, {});

    if (!token) {
        return (
            <div className={styles.card}>
                <AlertTriangle size={28} aria-hidden="true" />
                <h2>Invalid link</h2>
                <p>This reset link is invalid or has expired.</p>
                <p className={styles.switch}>
                    <Link href="/ojogbon/forgot-password">Request a new one</Link>
                </p>
            </div>
        );
    }

    if (state?.success) {
        return (
            <div className={styles.card}>
                <Check size={28} aria-hidden="true" />
                <h2>Password updated</h2>
                <p>You can now log in with your new password.</p>
                <Link href="/ojogbon/login" className={styles.btn} style={{ textDecoration: 'none', justifySelf: 'start' }}>
                    Go to log in <ArrowRight size={18} aria-hidden="true" />
                </Link>
            </div>
        );
    }

    return (
        <form action={formAction} className={styles.card} noValidate>
            <input type="hidden" name="token" value={token} />
            <div className={styles.field}>
                <label htmlFor="oj-rp-password">New password</label>
                <input id="oj-rp-password" name="password" type="password" autoComplete="new-password" minLength={8} required />
                <span className={styles.hint}>At least 8 characters.</span>
            </div>
            <div className={styles.field}>
                <label htmlFor="oj-rp-confirm">Confirm password</label>
                <input id="oj-rp-confirm" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            {state?.error && (
                <p className={styles.formErr} role="alert">
                    {state.error}
                </p>
            )}
            <button type="submit" className={styles.btn} disabled={pending}>
                {pending ? 'Updating…' : 'Reset password'}
                {!pending && <ArrowRight size={18} aria-hidden="true" />}
            </button>
        </form>
    );
}

export default function OjogbonResetPasswordPage() {
    return (
        <div className={styles.page}>
            <header className={styles.top}>
                <Link href="/ojogbon" className={styles.wordmark}>
                    Ojogbon
                </Link>
            </header>
            <main className={styles.main}>
                <div className={styles.intro}>
                    <p className={styles.eyebrow}>Account recovery</p>
                    <h1 className={styles.h1}>Set a new password.</h1>
                    <p className={styles.lede}>Choose something you haven’t used before.</p>
                </div>
                <Suspense fallback={<div className={styles.card}>Loading…</div>}>
                    <ResetPasswordForm />
                </Suspense>
            </main>
        </div>
    );
}
