'use client';

import { useActionState, useEffect, Suspense } from 'react';
import { authenticate } from '@/app/lib/actions';
import { Loader2, Shield, Users } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import styles from '../auth.module.css';

function LoginForm() {
    const [state, dispatch, isPending] = useActionState(authenticate, undefined);
    const searchParams = useSearchParams();
    const queryMessage = searchParams.get('message');
    const queryError = searchParams.get('error');

    useEffect(() => {
        if (state?.success) {
            window.location.href = '/briefs';
        }
    }, [state?.success]);

    return (
        <div className={styles.authContainer}>
            {/* Branding Side */}
            <div className={styles.brandingSide}>
                <div className={styles.logo}>
                    <Image
                        src="/logo.png"
                        alt="Reforma Logo"
                        width={40}
                        height={40}
                        className={styles.logoImage}
                    />
                    <span className={styles.logoText}>Reforma</span>
                </div>

                <div className={styles.brandingContent}>
                    <h1 className={styles.brandingTitle}>
                        Modern Legal Practice<br />Management
                    </h1>
                    <p className={styles.brandingDescription}>
                        Manage documents, communicate internally, track finances and scale your firm with Reforma
                    </p>

                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <div className={styles.featureIconWrapper}>
                                <Shield className={styles.featureIcon} />
                            </div>
                            <div className={styles.featureContent}>
                                <h3>Secure & Compliant</h3>
                                <p>Built in line with Nigerian and global data protection provisions.</p>
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIconWrapper}>
                                <Users className={styles.featureIcon} />
                            </div>
                            <div className={styles.featureContent}>
                                <h3>Team Collaboration</h3>
                                <p>Work seamlessly with your entire firm</p>
                            </div>
                        </div>
                    </div>
                </div>

                <p className={styles.copyright}>
                    © 2024 Reforma. All rights reserved.
                </p>
            </div>

            {/* Form Side */}
            <div className={styles.formSide}>
                <div className={styles.formContainer}>
                    <div className={styles.formHeader}>
                        <h2 className={styles.formTitle}>Welcome back</h2>
                        <p className={styles.formSubtitle}>
                            Sign in to your legal workspace
                        </p>
                    </div>

                    <form action={dispatch} className={styles.form}>
                        {queryMessage && (
                            <div className="p-3 mb-4 text-sm text-green-700 bg-green-50 rounded-lg border border-green-200">
                                {queryMessage}
                            </div>
                        )}

                        {queryError && (
                            <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
                                {queryError}
                            </div>
                        )}

                        {state?.message && (
                            <div className={styles.error}>
                                {state.message}
                            </div>
                        )}

                        {/* User Credentials */}
                        <div className={styles.formGroup}>
                            <label htmlFor="email" className={styles.label}>
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className={styles.input}
                                placeholder="you@lawfirm.com"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="password" className={styles.label}>
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className={styles.input}
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isPending || state?.success}
                            className={styles.submitButton}
                        >
                            {isPending || state?.success ? (
                                <>
                                    <Loader2 className={styles.spinner} size={20} />
                                    {state?.success ? 'Redirecting...' : 'Signing in...'}
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </button>

                        <div className={styles.divider} style={{ margin: '24px 0', textAlign: 'center', position: 'relative' }}>
                            <span style={{ background: '#fff', padding: '0 10px', color: '#94a3b8', fontSize: '14px' }}>OR</span>
                            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#e2e8f0', zIndex: -1 }}></div>
                        </div>

                        <div className={styles.formGroup}>
                            <p className={styles.formSubtitle} style={{ marginBottom: '12px' }}>
                                Sign in with a secure link sent to your email
                            </p>
                            <button
                                type="button"
                                onClick={async () => {
                                    const email = (document.getElementById('email') as HTMLInputElement).value;
                                    if (!email) {
                                        alert('Please enter your email address first.');
                                        return;
                                    }
                                    const { signIn } = await import('next-auth/react');
                                    await signIn('resend', { email, callbackUrl: '/briefs' });
                                }}
                                className={styles.submitButton}
                                style={{ background: '#fff', color: '#121826', border: '1px solid #e2e8f0' }}
                            >
                                Send Magic Link
                            </button>
                        </div>

                        <div className={styles.footer} style={{ marginTop: '20px', textAlign: 'center' }}>
                            <Link href="/forgot-password" className={styles.footerLink}>
                                Forgot your password?
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className={styles.authContainer}>
                <div className={styles.formSide}>
                    <div className={styles.formContainer}>
                        <Loader2 className="animate-spin" />
                        <p>Loading login...</p>
                    </div>
                </div>
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
