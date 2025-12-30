'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, Loader2, Building2 } from 'lucide-react';
import { verifyInviteToken } from '@/app/actions/join';

interface JoinPageProps {
    params: Promise<{ token: string }>;
}

export default function JoinPage({ params }: JoinPageProps) {
    const router = useRouter();
    const [token, setToken] = useState('');
    const [workspace, setWorkspace] = useState<{ id: string; name: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        params.then(async (p) => {
            setToken(p.token);
            const result = await verifyInviteToken(p.token);
            if (result.error) {
                setError(result.error);
            } else if (result.workspace) {
                setWorkspace(result.workspace);
            }
            setLoading(false);
        });
    }, [params]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        if (!name || !email || !phone || !password) {
            setError('Please fill in all fields');
            setSubmitting(false);
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            setSubmitting(false);
            return;
        }

        try {
            const response = await fetch('/api/join-workspace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, name, email, phone, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to join workspace');
            }

            // Redirect to login
            router.push(`/login?email=${encodeURIComponent(email)}&joined=true`);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to join workspace');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={{ marginTop: '1rem', color: '#666' }}>Verifying invite link...</p>
                </div>
            </div>
        );
    }

    if (error && !workspace) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', textAlign: 'center', maxWidth: '400px' }}>
                    <h1 style={{ color: '#dc2626', marginBottom: '1rem' }}>Invalid Link</h1>
                    <p style={{ color: '#666', marginBottom: '1.5rem' }}>{error}</p>
                    <button
                        onClick={() => router.push('/login')}
                        style={{ background: '#0f172a', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '420px', width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Scale size={28} />
                        <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Reforma</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#0f766e', background: '#ecfdf5', padding: '0.75rem', borderRadius: '8px' }}>
                        <Building2 size={20} />
                        <span>Join <strong>{workspace?.name}</strong></span>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="John Doe"
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '1rem' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '1rem' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Phone</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            placeholder="+234 800 000 0000"
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '1rem' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                            placeholder="••••••••"
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '1rem' }}
                        />
                        <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>Minimum 8 characters</p>
                    </div>

                    {error && (
                        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: '#0f766e',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 600,
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                Joining...
                            </>
                        ) : (
                            'Join Workspace'
                        )}
                    </button>

                    <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
                        Already have an account? <a href="/login" style={{ color: '#0f766e' }}>Sign in</a>
                    </p>
                </form>
            </div>
        </div>
    );
}
