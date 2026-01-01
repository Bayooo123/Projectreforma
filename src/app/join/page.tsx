'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, Users, Shield, Loader2 } from 'lucide-react';
import Link from 'next/link';
import styles from '../(auth)/auth.module.css';
import { registerWithFirmCode } from '@/app/actions/workspace';
import { signIn } from 'next-auth/react';

export default function JoinFirmPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'firm' | 'user'>('firm');
    const [firmData, setFirmData] = useState({ firmCode: '', firmPassword: '' });
    const [userData, setUserData] = useState({ name: '', email: '', password: '' });

    const handleFirmSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!firmData.firmCode || !firmData.firmPassword) {
            setError('Please enter firm code and password');
            return;
        }
        setError('');
        setStep('user');
    };

    const handleUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userData.name || !userData.email || !userData.password) {
            setError('Please fill in all fields');
            return;
        }
        if (userData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Register the user and join the workspace
            const result = await registerWithFirmCode({
                firmCode: firmData.firmCode,
                firmPassword: firmData.firmPassword,
                name: userData.name,
                email: userData.email,
                password: userData.password,
            });

            if (!result.success) {
                setError(result.error || 'Failed to join firm');
                setIsLoading(false);
                return;
            }

            // Sign in with the new credentials
            const signInResult = await signIn('credentials', {
                email: userData.email,
                password: userData.password,
                firmCode: firmData.firmCode,
                firmPassword: firmData.firmPassword,
                redirect: false,
            });

            if (signInResult?.error) {
                setError('Account created but failed to sign in. Please try logging in.');
                setIsLoading(false);
                return;
            }

            // Redirect to dashboard
            router.push('/management/clients');
        } catch (err) {
            console.error('Join error:', err);
            setError('Something went wrong. Please try again.');
            setIsLoading(false);
        }
    };

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
                        Join Your<br />Firm's Workspace
                    </h1>
                    <p className={styles.brandingDescription}>
                        Your firm admin has set up a workspace. Enter the firm code
                        and password they provided to join the team.
                    </p>

                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <Users className={styles.featureIcon} />
                            <div className={styles.featureContent}>
                                <h3>Team Collaboration</h3>
                                <p>Work with your colleagues in real-time</p>
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <Shield className={styles.featureIcon} />
                            <div className={styles.featureContent}>
                                <h3>Secure Access</h3>
                                <p>Your data stays within your firm</p>
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
                        <h2 className={styles.formTitle}>
                            {step === 'firm' ? 'Enter Firm Credentials' : 'Create Your Account'}
                        </h2>
                        <p className={styles.formSubtitle}>
                            {step === 'firm' ? (
                                <>Already have an account? <Link href="/login">Sign in</Link></>
                            ) : (
                                <>Step 2 of 2 · <button onClick={() => setStep('firm')} style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Go back</button></>
                            )}
                        </p>
                    </div>

                    {step === 'firm' ? (
                        <form onSubmit={handleFirmSubmit} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label htmlFor="firmCode" className={styles.label}>
                                    Firm Code
                                </label>
                                <input
                                    id="firmCode"
                                    type="text"
                                    value={firmData.firmCode}
                                    onChange={(e) => setFirmData({ ...firmData, firmCode: e.target.value })}
                                    className={styles.input}
                                    placeholder="e.g. ASCOLP"
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="firmPassword" className={styles.label}>
                                    Firm Password
                                </label>
                                <input
                                    id="firmPassword"
                                    type="password"
                                    value={firmData.firmPassword}
                                    onChange={(e) => setFirmData({ ...firmData, firmPassword: e.target.value })}
                                    className={styles.input}
                                    placeholder="Provided by your firm admin"
                                    required
                                />
                            </div>

                            {error && <div className={styles.error}>{error}</div>}

                            <button type="submit" className={styles.submitButton}>
                                Continue
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleUserSubmit} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label htmlFor="name" className={styles.label}>
                                    Full Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={userData.name}
                                    onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                                    className={styles.input}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="email" className={styles.label}>
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={userData.email}
                                    onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                                    className={styles.input}
                                    placeholder="you@lawfirm.com"
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="password" className={styles.label}>
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={userData.password}
                                    onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                                    className={styles.input}
                                    placeholder="At least 6 characters"
                                    required
                                />
                            </div>

                            {error && <div className={styles.error}>{error}</div>}

                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className={styles.spinner} size={20} />
                                        Joining firm...
                                    </>
                                ) : (
                                    'Create Account & Join Firm'
                                )}
                            </button>
                        </form>
                    )}

                    <div className={styles.footer}>
                        <Link href="/login" className={styles.footerLink}>
                            Already have an account? Sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
