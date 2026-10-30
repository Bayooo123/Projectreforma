'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { ojogbonForgotPassword, type OjogbonForgotPasswordState } from '../../actions/ojogbon-auth';
import styles from '../auth.module.css';

export default function OjogbonForgotPasswordPage() {
    const [state, formAction, pending] = useActionState<OjogbonForgotPasswordState | undefined, FormData>(
        ojogbonForgotPassword,
        undefined,
    );

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
                    <h1 className={styles.h1}>Forgot your password?</h1>
                    <p className={styles.lede}>
                        Enter the email you signed up with and we’ll send you a secure link to set a new one. It expires
                        in an hour and works once.
                    </p>
                </div>
                {state?.success ? (
                    <div className={styles.card}>
                        <Check size={28} aria-hidden="true" />
                        <p>{state.message}</p>
                        <p className={styles.switch}>
                            <Link href="/ojogbon/login">Back to log in</Link>
                        </p>
                    </div>
                ) : (
                    <form action={formAction} className={styles.card} noValidate>
                        <div className={styles.field}>
                            <label htmlFor="oj-fp-email">Email</label>
                            <input id="oj-fp-email" name="email" type="email" autoComplete="email" required />
                        </div>
                        {state?.error && (
                            <p className={styles.formErr} role="alert">
                                {state.error}
                            </p>
                        )}
                        <button type="submit" className={styles.btn} disabled={pending}>
                            {pending ? 'Sending…' : 'Send reset link'}
                            {!pending && <ArrowRight size={18} aria-hidden="true" />}
                        </button>
                        <p className={styles.switch}>
                            <Link href="/ojogbon/login">Back to log in</Link>
                        </p>
                    </form>
                )}
            </main>
        </div>
    );
}
