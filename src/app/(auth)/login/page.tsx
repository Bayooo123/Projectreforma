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
                        Streamline your law firm operations with intelligent case management,
                        automated workflows, and powerful analytics.
                    </p>

                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <Shield className={styles.featureIcon} />
                            <div className={styles.featureContent}>
                                <h3>Secure & Compliant</h3>
                                <p>Bank-level encryption and data protection</p>
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
                            Don't have an account?{' '}
                            <Link href="/register">Create your firm</Link>
                        </p>
                    </div>

                    <form action={dispatch} className={styles.form}>
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
