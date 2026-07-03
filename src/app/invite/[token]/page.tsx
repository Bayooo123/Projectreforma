'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, Loader2, CheckCircle, XCircle, Building2, AlertCircle, Clock, Eye, EyeOff } from 'lucide-react';
import styles from './invite.module.css';

interface InvitationPageProps {
    params: Promise<{ token: string }>;
}

interface InvitationDetails {
    workspace: { name: string };
    email: string;
    role: string;
    inviter: { name: string };
    expiresAt: string;
}

export default function InvitationPage({ params }: InvitationPageProps) {
    const router = useRouter();
    const [token, setToken] = useState<string>('');
    const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [existingUserEmail, setExistingUserEmail] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const errorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        params.then(p => {
            setToken(p.token);
            fetchInvitation(p.token);
        });
    }, [params]);

    // Scroll error into view when it appears (critical on mobile w/ keyboard open)
    useEffect(() => {
        if (error && errorRef.current) {
            errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [error]);

    const fetchInvitation = async (inviteToken: string) => {
        try {
            const response = await fetch(`/api/invitations/${inviteToken}`);
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Invalid invitation');
            }
            const data = await response.json();
            setInvitation(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load invitation');
        } finally {
            setLoading(false);
        }
    };

    const getExpiryLabel = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - Date.now();
        const hours = Math.floor(diff / 1000 / 60 / 60);
        if (hours < 1) return 'Expires in less than an hour';
        if (hours < 24) return `Expires in ${hours}h`;
        const days = Math.floor(hours / 24);
        return `Expires in ${days} day${days > 1 ? 's' : ''}`;
    };

    const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
    const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) {
            setError('Please enter your full name');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match — please re-enter them carefully');
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch('/api/invitations/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, name: name.trim(), password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to accept invitation');
            }

            if (data.requiresLogin) {
                setExistingUserEmail(data.email);
                return;
            }

            setSuccess(true);
            setTimeout(() => {
                router.push(`/login?email=${encodeURIComponent(data.email)}`);
            }, 2500);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to accept invitation');
        } finally {
            setSubmitting(false);
        }
    };

    /* ── Loading ── */
    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingCard}>
                    <Loader2 className={styles.spinner} size={40} />
                    <p>Loading invitation...</p>
                </div>
            </div>
        );
    }

    /* ── Error (invalid / expired link) ── */
    if (error && !invitation) {
        return (
            <div className={styles.container}>
                <div className={styles.errorCard}>
                    <XCircle size={48} className={styles.errorIcon} />
                    <h1>Invalid Invitation</h1>
                    <p>{error}</p>
                    <button onClick={() => router.push('/login')} className={styles.button}>
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    /* ── Existing User ── */
    if (existingUserEmail) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.header}>
                        <div className={styles.logo}><Scale size={32} /><span>Reforma</span></div>
                    </div>
                    <div className={styles.invitationInfo}>
                        <AlertCircle size={48} className={styles.warningIcon} />
                        <h1 className={styles.title}>Account Already Exists</h1>
                        <p className={styles.description}>
                            An account for <strong>{existingUserEmail}</strong> already exists.
                            Sign in to complete accepting the invitation to{' '}
                            <strong>{invitation?.workspace.name}</strong>.
                        </p>
                        <button
                            onClick={() => router.push(`/login?email=${encodeURIComponent(existingUserEmail)}`)}
                            className={styles.submitButton}
                            style={{ marginTop: '1.5rem' }}
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Success ── */
    if (success) {
        return (
            <div className={styles.container}>
                <div className={styles.successCard}>
                    <CheckCircle size={48} className={styles.successIcon} />
                    <h1>Welcome aboard!</h1>
                    <p>You&apos;ve successfully joined <strong>{invitation?.workspace.name}</strong></p>
                    <p>Check your email to verify your account.</p>
                    <p className={styles.redirectText}>Redirecting to login...</p>
                </div>
            </div>
        );
    }

    /* ── Main signup form ── */
    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.logo}><Scale size={32} /><span>Reforma</span></div>
                </div>

                <div className={styles.invitationInfo}>
                    <div className={styles.workspaceIcon}><Building2 size={32} /></div>
                    <h1 className={styles.title}>You&apos;ve been invited!</h1>
                    <p className={styles.description}>
                        <strong>{invitation?.inviter.name}</strong> has invited you to join{' '}
                        <strong>{invitation?.workspace.name}</strong> as a{' '}
                        <strong>{invitation?.role}</strong>.
                    </p>
                    {invitation?.expiresAt && (
                        <p className={styles.hint} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                            <Clock size={13} />
                            {getExpiryLabel(invitation.expiresAt)}
                        </p>
                    )}
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="email" className={styles.label}>Email Address</label>
                        <input
                            id="email"
                            type="email"
                            value={invitation?.email || ''}
                            disabled
                            className={`${styles.input} ${styles.inputDisabled}`}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="name" className={styles.label}>Your Full Name</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            required
                            autoComplete="name"
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="password" className={styles.label}>Create Password</label>
                        <div className={styles.passwordWrapper}>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="new-password"
                                className={styles.input}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className={styles.eyeBtn}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <p className={styles.hint}>Minimum 8 characters</p>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
                        <div className={styles.passwordWrapper}>
                            <input
                                id="confirmPassword"
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="new-password"
                                className={`${styles.input} ${passwordsMatch ? styles.inputValid : ''} ${passwordsMismatch ? styles.inputError : ''}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(v => !v)}
                                className={styles.eyeBtn}
                                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                            >
                                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {passwordsMatch && (
                            <p className={styles.matchHint}><CheckCircle size={13} /> Passwords match</p>
                        )}
                        {passwordsMismatch && (
                            <p className={styles.mismatchHint}><XCircle size={13} /> Passwords do not match</p>
                        )}
                    </div>

                    {error && (
                        <div ref={errorRef} className={styles.error}>{error}</div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || passwordsMismatch}
                        className={styles.submitButton}
                    >
                        {submitting ? (
                            <><Loader2 className={styles.spinner} size={20} />Joining workspace...</>
                        ) : (
                            'Accept Invitation & Join'
                        )}
                    </button>

                    <p className={styles.footer}>
                        Already have an account?{' '}
                        <a href="/login" className={styles.link}>Sign in</a>
                    </p>
                </form>
            </div>
        </div>
    );
}
