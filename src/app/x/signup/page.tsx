'use client';

import { useActionState, useEffect, useState } from 'react';
import { signUpWithScn } from '@/app/actions/reforma-x';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import styles from '../x.module.css';

export default function ReformaXSignupPage() {
    const [state, dispatch, isPending] = useActionState(signUpWithScn, undefined);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (state?.success) {
            window.location.href = '/x/onboarding';
        }
    }, [state?.success]);

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.brand}>
                    <span className={styles.brandName}>Reforma</span>
                    <span className={styles.brandX}>X</span>
                </div>
                <h1 className={styles.title}>Sign up with your SCN</h1>
                <p className={styles.subtitle}>Your Supreme Court enrollment number identifies you as counsel — no firm code needed to get started.</p>

                <form className={styles.form} action={dispatch}>
                    <div>
                        <label className={styles.label} htmlFor="name">Full name</label>
                        <input className={styles.input} id="name" name="name" type="text" required autoComplete="name" />
                    </div>
                    <div>
                        <label className={styles.label} htmlFor="email">Email</label>
                        <input className={styles.input} id="email" name="email" type="email" required autoComplete="email" />
                    </div>
                    <div>
                        <label className={styles.label} htmlFor="scn">Supreme Court enrollment number (SCN)</label>
                        <input className={styles.input} id="scn" name="scn" type="text" required placeholder="e.g. SCN/2015/1234" />
                        <div className={styles.hint}>Self-declared for now — we don&apos;t verify against the roll yet.</div>
                    </div>
                    <div>
                        <label className={styles.label} htmlFor="password">Password</label>
                        <div className={styles.passwordWrap}>
                            <input
                                className={styles.input}
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                minLength={8}
                                autoComplete="new-password"
                            />
                            <button type="button" className={styles.passwordToggle} onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <div className={styles.hint}>At least 8 characters.</div>
                    </div>

                    {state?.message && <div className={styles.error}>{state.message}</div>}

                    <button className={styles.submit} type="submit" disabled={isPending}>
                        {isPending ? <Loader2 size={16} className={styles.spin} /> : 'Create account'}
                    </button>
                </form>

                <div className={styles.switchLine}>
                    Already have a Reforma account? <Link href="/x/login">Log in</Link>
                </div>
            </div>
        </div>
    );
}
