'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, Loader2, CheckCircle, XCircle, Building2, AlertCircle, Clock } from 'lucide-react';
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
    // State for when the invited email already has an account
    const [existingUserEmail, setExistingUserEmail] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        params.then(p => {
            setToken(p.token);
            fetchInvitation(p.token);
        });
    }, [params]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name || !password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch('/api/invitations/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, name, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to accept invitation');
            }

            // Existing user path — API returns requiresLogin: true
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
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="password" className={styles.label}>Create Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={8}
                            className={styles.input}
                        />
                        <p className={styles.hint}>Minimum 8 characters</p>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={8}
                            className={styles.input}
                        />
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <button type="submit" disabled={submitting} className={styles.submitButton}>
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
