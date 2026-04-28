'use client';

import { useActionState, useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Lock, Check, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { updatePassword } from '@/app/actions/reset-password';
import styles from '../../auth.module.css';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [state, action, isPending] = useActionState(updatePassword, {});
    const [missingToken, setMissingToken] = useState(false);

    useEffect(() => {
        if (!token) setMissingToken(true);
    }, [token]);

    if (missingToken) {
        return (
            <div className={styles.authContainer}>
                <div className={styles.brandingSide}>
                    <div className={styles.logo}>
                        <Image src="/logo.png" alt="Reforma" width={40} height={40} className={styles.logoImage} />
                        <span className={styles.logoText}>Reforma</span>
                    </div>
                    <div className={styles.brandingContent}>
                        <h1 className={styles.brandingTitle}>Secure Legal<br />Practice Management</h1>
                        <p className={styles.brandingDescription}>Your account security is our priority.</p>
                    </div>
                    <p className={styles.copyright}>© 2024 Reforma. All rights reserved.</p>
                </div>

                <div className={styles.formSide}>
                    <div className={styles.formContainer}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                <AlertTriangle size={26} color="#dc2626" />
                            </div>
                            <h2 className={styles.formTitle}>Invalid Link</h2>
                            <p className={styles.formSubtitle}>This reset link is invalid or has expired. Request a new one.</p>
                        </div>
                        <Link href="/forgot-password" className={styles.submitButton} style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center' }}>
                            Request new link
                        </Link>
                        <div className={styles.footer}>
                            <Link href="/login" className={styles.footerLink}>Back to Login</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.authContainer}>
            {/* Branding Side */}
            <div className={styles.brandingSide}>
                <div className={styles.logo}>
                    <Image src="/logo.png" alt="Reforma" width={40} height={40} className={styles.logoImage} />
                    <span className={styles.logoText}>Reforma</span>
                </div>

                <div className={styles.brandingContent}>
                    <h1 className={styles.brandingTitle}>
                        Your security<br />matters to us
                    </h1>
                    <p className={styles.brandingDescription}>
                        Choose a strong password to protect your firm's data. We recommend at least 8 characters with a mix of letters and numbers.
                    </p>
                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <div className={styles.featureIconWrapper}>
                                <ShieldCheck className={styles.featureIcon} />
                            </div>
                            <div className={styles.featureContent}>
                                <h3>End-to-end encrypted</h3>
                                <p>Your credentials are never stored in plain text.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <p className={styles.copyright}>© 2024 Reforma. All rights reserved.</p>
            </div>

            {/* Form Side */}
            <div className={styles.formSide}>
                <div className={styles.formContainer}>
                    {state.success ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                <Check size={28} color="#059669" />
                            </div>
                            <h2 className={styles.formTitle}>Password updated</h2>
                            <p className={styles.formSubtitle} style={{ marginBottom: '2rem' }}>
                                Your password has been reset successfully. You can now sign in with your new credentials.
                            </p>
                            <Link href="/login" className={styles.submitButton} style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center' }}>
                                Go to Login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className={styles.formHeader}>
                                <h2 className={styles.formTitle}>Set new password</h2>
                                <p className={styles.formSubtitle}>Enter and confirm your new password below.</p>
                            </div>

                            <form action={action} className={styles.form}>
                                <input type="hidden" name="token" value={token || ''} />

                                <div className={styles.formGroup}>
                                    <label htmlFor="password" className={styles.label}>New Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ position: 'absolute', inset: '0 auto 0 0', width: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                            <Lock size={16} color="#94a3b8" />
                                        </div>
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            required
                                            minLength={6}
                                            className={styles.input}
                                            placeholder="••••••••"
                                            style={{ paddingLeft: '2.5rem' }}
                                        />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ position: 'absolute', inset: '0 auto 0 0', width: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                            <Lock size={16} color="#94a3b8" />
                                        </div>
                                        <input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type="password"
                                            required
                                            minLength={6}
                                            className={styles.input}
                                            placeholder="••••••••"
                                            style={{ paddingLeft: '2.5rem' }}
                                        />
                                    </div>
                                </div>

                                {state.error && (
                                    <div className={styles.error}>{state.error}</div>
                                )}

                                <button type="submit" disabled={isPending} className={styles.submitButton}>
                                    {isPending ? (
                                        <><Loader2 className={styles.spinner} size={18} /> Updating password...</>
                                    ) : (
                                        'Reset Password'
                                    )}
                                </button>

                                <div className={styles.footer}>
                                    <Link href="/login" className={styles.footerLink}>Back to Login</Link>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className={styles.authContainer}>
                <div className={styles.formSide} style={{ flex: 1 }}>
                    <Loader2 className="animate-spin" size={32} color="#059669" />
                </div>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
