'use client';

import { useActionState, useEffect, useState } from 'react';
import { authenticate } from '@/app/lib/actions';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import styles from '../x.module.css';

export default function ReformaXLoginPage() {
    const [state, dispatch, isPending] = useActionState(authenticate, undefined);
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
                <h1 className={styles.title}>Welcome back</h1>
                <p className={styles.subtitle}>Log in with your Reforma account.</p>

                <form className={styles.form} action={dispatch}>
                    <div>
                        <label className={styles.label} htmlFor="email">Email</label>
                        <input className={styles.input} id="email" name="email" type="email" required autoComplete="email" />
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
                                autoComplete="current-password"
                            />
                            <button type="button" className={styles.passwordToggle} onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {state?.mfaRequired && (
                        <div>
                            <label className={styles.label} htmlFor="mfaCode">Authentication code</label>
                            <input className={styles.input} id="mfaCode" name="mfaCode" type="text" inputMode="numeric" maxLength={6} />
                        </div>
                    )}

                    {state?.message && <div className={styles.error}>{state.message}</div>}

                    <button className={styles.submit} type="submit" disabled={isPending}>
                        {isPending ? <Loader2 size={16} className={styles.spin} /> : 'Log in'}
                    </button>
                </form>

                <div className={styles.switchLine}>
                    New here? <Link href="/x/signup">Sign up with your SCN</Link>
                </div>
            </div>
        </div>
    );
}
