'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, ArrowLeft, Loader2, Check, KeyRound, ShieldCheck } from 'lucide-react';
import { resetPassword } from '@/app/actions/reset-password';
import styles from '../auth.module.css';

export default function ForgotPasswordPage() {
    const [state, action, isPending] = useActionState(resetPassword, {});

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
                        Account recovery,<br />handled securely
                    </h1>
                    <p className={styles.brandingDescription}>
                        We'll send a secure, one-time link to your inbox. It expires in 15 minutes to keep your account protected.
                    </p>
                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <div className={styles.featureIconWrapper}>
                                <KeyRound className={styles.featureIcon} />
                            </div>
                            <div className={styles.featureContent}>
                                <h3>One-time reset link</h3>
                                <p>Each link is single-use and expires after 15 minutes.</p>
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIconWrapper}>
                                <ShieldCheck className={styles.featureIcon} />
                            </div>
                            <div className={styles.featureContent}>
                                <h3>Secure by default</h3>
                                <p>We never reveal whether an account exists for a given email.</p>
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
                            <div style={{
                                width: 64, height: 64, borderRadius: '50%',
                                background: '#f0fdf4', border: '2px solid #bbf7d0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1.5rem',
                            }}>
                                <Check size={28} color="#059669" />
                            </div>
                            <h2 className={styles.formTitle}>Check your inbox</h2>
                            <p className={styles.formSubtitle} style={{ marginBottom: '2rem' }}>
                                {state.message || 'If an account exists with that email, a reset link has been sent.'}
                            </p>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '2rem' }}>
                                Didn't receive it? Check your spam folder or wait a few minutes before trying again.
                            </p>
                            <Link href="/login" className={styles.submitButton} style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center' }}>
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className={styles.formHeader}>
                                <h2 className={styles.formTitle}>Forgot password?</h2>
                                <p className={styles.formSubtitle}>
                                    Enter your work email and we'll send you a reset link.
                                </p>
                            </div>

                            <form action={action} className={styles.form}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="email" className={styles.label}>Email address</label>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{
                                            position: 'absolute', inset: '0 auto 0 0',
                                            width: 42, display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', pointerEvents: 'none',
                                        }}>
                                            <Mail size={16} color="#94a3b8" />
                                        </div>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            className={styles.input}
                                            placeholder="you@yourfirm.com"
                                            style={{ paddingLeft: '2.5rem' }}
                                        />
                                    </div>
                                </div>

                                {state.error && (
                                    <div className={styles.error}>{state.error}</div>
                                )}

                                <button type="submit" disabled={isPending} className={styles.submitButton}>
                                    {isPending ? (
                                        <><Loader2 className={styles.spinner} size={18} /> Sending link...</>
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </button>

                                <div className={styles.footer}>
                                    <Link href="/login" className={styles.footerLink} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <ArrowLeft size={14} /> Back to Login
                                    </Link>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
