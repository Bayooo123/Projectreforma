'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ojogbonLogIn, ojogbonSignUp, type OjogbonAuthState } from '../actions/ojogbon-auth';
import styles from './auth.module.css';

export default function AuthForm({ mode }: { mode: 'signup' | 'login' }) {
    const action = mode === 'signup' ? ojogbonSignUp : ojogbonLogIn;
    const [state, formAction, pending] = useActionState<OjogbonAuthState | undefined, FormData>(action, undefined);
    const fe = state?.fieldErrors ?? {};
    const signup = mode === 'signup';

    return (
        <div className={styles.page}>
            <header className={styles.top}>
                <Link href="/ojogbon" className={styles.wordmark}>
                    Ojogbon
                </Link>
            </header>
            <main className={styles.main}>
                <div className={styles.intro}>
                    <p className={styles.eyebrow}>{signup ? 'Free while in early access' : 'Welcome back'}</p>
                    <h1 className={styles.h1}>{signup ? 'Start your first paper.' : 'Log in to keep writing.'}</h1>
                    <p className={styles.lede}>
                        {signup
                            ? 'Create an account and go straight to the writing studio. Bring a topic, an outline or a draft.'
                            : 'Your papers, notes and library are where you left them.'}
                    </p>
                </div>
                <form action={formAction} className={styles.card} noValidate>
                    {signup && (
                        <div className={styles.field}>
                            <label htmlFor="oj-name">Full name</label>
                            <input id="oj-name" name="name" autoComplete="name" required />
                            {fe.name && <span className={styles.err}>{fe.name}</span>}
                        </div>
                    )}
                    <div className={styles.field}>
                        <label htmlFor="oj-email">Email</label>
                        <input id="oj-email" name="email" type="email" autoComplete="email" required />
                        {fe.email && <span className={styles.err}>{fe.email}</span>}
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="oj-password">Password</label>
                        <input
                            id="oj-password"
                            name="password"
                            type="password"
                            autoComplete={signup ? 'new-password' : 'current-password'}
                            minLength={8}
                            required
                        />
                        {signup && !fe.password && <span className={styles.hint}>At least 8 characters.</span>}
                        {fe.password && <span className={styles.err}>{fe.password}</span>}
                    </div>
                    {state?.message && (
                        <p className={styles.formErr} role="alert">
                            {state.message}
                        </p>
                    )}
                    <button type="submit" className={styles.btn} disabled={pending}>
                        {pending ? (signup ? 'Creating your account…' : 'Logging in…') : signup ? 'Create account' : 'Log in'}
                        {!pending && <ArrowRight size={18} aria-hidden="true" />}
                    </button>
                    <p className={styles.switch}>
                        {signup ? (
                            <>
                                Already have an account? <Link href="/ojogbon/login">Log in</Link>
                            </>
                        ) : (
                            <>
                                New to Ojogbon? <Link href="/ojogbon/signup">Create an account</Link>
                            </>
                        )}
                    </p>
                    {!signup && (
                        <p className={styles.switch}>
                            <Link href="/forgot-password">Forgot your password?</Link>
                        </p>
                    )}
                </form>
            </main>
        </div>
    );
}
