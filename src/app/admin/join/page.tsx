"use client";

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function JoinForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token') ?? '';

    const [step, setStep] = useState<'checking' | 'new_user' | 'existing_user' | 'done' | 'error'>('checking');
    const [invitedEmail, setInvitedEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const checkToken = async () => {
        if (!token) { setStep('error'); setErrorMsg('No invitation token found.'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/admin/invite/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            const data = await res.json();
            if (!res.ok) { setStep('error'); setErrorMsg(data.error); return; }
            if (data.requiresLogin) {
                setInvitedEmail(data.email);
                setStep('existing_user');
            } else if (data.needsSignup) {
                setInvitedEmail(data.email);
                setStep('new_user');
            } else if (data.isNewUser) {
                setStep('done');
            }
        } catch {
            setStep('error');
            setErrorMsg('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleNewUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        if (password !== confirmPassword) { setErrorMsg('Passwords do not match.'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/admin/invite/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, name, password }),
            });
            const data = await res.json();
            if (!res.ok) { setErrorMsg(data.error); return; }
            setStep('done');
        } catch {
            setErrorMsg('Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
        borderRadius: 8, fontSize: '0.9rem', fontFamily: 'inherit',
        background: '#fff', color: '#111827', outline: 'none', boxSizing: 'border-box',
    };

    const btnStyle: React.CSSProperties = {
        width: '100%', padding: '11px', background: '#064e3b', color: '#fff',
        border: 'none', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit',
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', width: '100%', maxWidth: 420, overflow: 'hidden' }}>
                <div style={{ background: '#064e3b', padding: '24px 32px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Georgia,serif', fontSize: 22, fontWeight: 600, color: '#fff' }}>
                        Re<span style={{ color: '#6EE7B7' }}>forma</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4, letterSpacing: '1px', textTransform: 'uppercase' }}>
                        HQ Administration
                    </div>
                </div>

                <div style={{ padding: '32px' }}>
                    {step === 'checking' && (
                        <>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
                                You've been invited
                            </h2>
                            <p style={{ color: '#6B7280', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 24px' }}>
                                You have been invited to join the Reforma platform administration team. Click below to accept.
                            </p>
                            {errorMsg && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: 12 }}>{errorMsg}</p>}
                            <button onClick={checkToken} disabled={loading} style={btnStyle}>
                                {loading ? 'Checking...' : 'Accept Invitation'}
                            </button>
                        </>
                    )}

                    {step === 'new_user' && (
                        <>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Create your admin account</h2>
                            <p style={{ color: '#6B7280', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 20px' }}>
                                You're creating a <strong>Reforma HQ</strong> platform admin account. This account is separate from any law firm workspace.
                            </p>
                            <form onSubmit={handleNewUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.9rem', background: '#f9fafb', color: '#6B7280', boxSizing: 'border-box' as const }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 2, color: '#9CA3AF', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Account email</span>
                                    {invitedEmail}
                                </div>
                                <input type="text" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
                                <input type="password" placeholder="Password (min 8 characters)" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
                                <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={inputStyle} />
                                {errorMsg && <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: 0 }}>{errorMsg}</p>}
                                <button type="submit" disabled={loading} style={btnStyle}>
                                    {loading ? 'Creating account...' : 'Create Admin Account'}
                                </button>
                            </form>
                        </>
                    )}

                    {step === 'existing_user' && (
                        <>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Access granted</h2>
                            <p style={{ color: '#6B7280', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 20px' }}>
                                Platform admin access has been added to <strong>{invitedEmail}</strong>. Log in to access Reforma HQ.
                            </p>
                            <button onClick={() => router.push('/login')} style={btnStyle}>Go to Login</button>
                        </>
                    )}

                    {step === 'done' && (
                        <>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>You're in</h2>
                            <p style={{ color: '#6B7280', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 20px' }}>
                                Your account has been created and you now have platform admin access. Log in to get started.
                            </p>
                            <button onClick={() => router.push('/login')} style={btnStyle}>Go to Login</button>
                        </>
                    )}

                    {step === 'error' && (
                        <>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444', margin: '0 0 8px' }}>Invalid invitation</h2>
                            <p style={{ color: '#6B7280', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
                                {errorMsg || 'This invitation link is invalid or has expired. Ask the platform admin to send a new one.'}
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AdminJoinPage() {
    return (
        <Suspense>
            <JoinForm />
        </Suspense>
    );
}
