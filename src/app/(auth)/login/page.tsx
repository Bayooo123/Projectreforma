'use client';

import { useActionState } from 'react';
import { authenticate } from '@/app/lib/actions';
import { Loader2, Scale, Shield, Users } from 'lucide-react';
import Link from 'next/link';
import styles from '../auth.module.css';

export default function LoginPage() {
    const [errorMessage, dispatch, isPending] = useActionState(authenticate, undefined);

    return (
        <div className={styles.authContainer}>
            {/* Branding Side */}
            <div className={styles.brandingSide}>
                <div className={styles.logo}>
                    <Scale className={styles.logoIcon} />
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
                            <Shield className={styles.featureIcon} />
                            <div className={styles.featureContent}>
                                <h3>Secure & Compliant</h3>
                                <p>Built in line with Nigerian and global data protection provisions.</p>
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <Users className={styles.featureIcon} />
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
                            Joining a firm? <Link href="/join">Sign in here</Link>
                            <span className={styles.divider}> · </span>
                            New firm? <Link href="/register">Create account</Link>
                        </p>
                    </div>

                    <form action={dispatch} className={styles.form}>
                        {/* Firm Credentials */}
                        <div className={styles.formGroup}>
                            <label htmlFor="firmCode" className={styles.label}>
                                Firm Code
                            </label>
                            <input
                                id="firmCode"
                                name="firmCode"
                                type="text"
                                required
                                className={styles.input}
                                placeholder="e.g. ASCOLP-001"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="firmPassword" className={styles.label}>
                                Firm Password
                            </label>
                            <input
                                id="firmPassword"
                                name="firmPassword"
                                type="password"
                                required
                                className={styles.input}
                                placeholder="Firm Access Code"
                            />
                        </div>

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

                        {errorMessage && (
                            <div className={styles.error}>
                                {errorMessage}
                            </div>
                        )}

                        <Link
                            href="/forgot-password"
                            className="text-sm font-medium text-primary hover:text-primary/80"
                        >
                            Forgot password?
                        </Link>

                        <button
                            type="submit"
                            disabled={isPending}
                            className={styles.submitButton}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className={styles.spinner} size={20} />
                                    Signing in...
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>

                    <div className={styles.footer}>
                        <Link href="/forgot-password" className={styles.footerLink}>
                            Forgot your password?
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
