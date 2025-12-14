'use client';

import { useFormState } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { validateFirmCredentials, FirmLoginState } from '@/app/actions/firm-auth';
import styles from './page.module.css';

const initialState: FirmLoginState = {};

export default function JoinFirmPage() {
    const [state, formAction] = useFormState(validateFirmCredentials, initialState);
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (state.success && state.firmId) {
            // Redirect to register page with firmId query param
            // We use a query param because we haven't created a session yet
            const params = new URLSearchParams();
            params.set('firmId', state.firmId);
            if (state.firmName) params.set('firmName', state.firmName);

            router.push(`/join-firm/register?${params.toString()}`);
        } else {
            setIsSubmitting(false);
        }
    }, [state, router]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        setIsSubmitting(true);
        // The form action will be handled by the hook, but we want to set loading state
    };

    return (
        <div className={styles.container} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
            <div className={styles.card} style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                maxWidth: '400px',
                width: '100%'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1a1a1a' }}>Join Your Firm</h1>
                    <p style={{ color: '#666', marginTop: '0.5rem' }}>Enter your team's access credentials</p>
                </div>

                <form action={formAction} onSubmit={handleSubmit}>
                    {state.errors?._form && (
                        <div style={{
                            background: '#fee2e2',
                            color: '#991b1b',
                            padding: '0.75rem',
                            borderRadius: '4px',
                            marginBottom: '1rem',
                            fontSize: '0.875rem'
                        }}>
                            {state.errors._form[0]}
                        </div>
                    )}

                    <div style={{ marginBottom: '1rem' }}>
                        <label htmlFor="firmCode" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                            Firm Code
                        </label>
                        <input
                            id="firmCode"
                            name="firmCode"
                            type="text"
                            required
                            placeholder="e.g. ASCO"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #e5e7eb',
                                borderRadius: '4px',
                                fontSize: '1rem'
                            }}
                        />
                        {state.errors?.firmCode && (
                            <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                {state.errors.firmCode[0]}
                            </p>
                        )}
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="firmPassword" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                            Firm Password
                        </label>
                        <input
                            id="firmPassword"
                            name="firmPassword"
                            type="password"
                            required
                            placeholder="Shared password"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #e5e7eb',
                                borderRadius: '4px',
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: '#0f172a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 600,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            opacity: isSubmitting ? 0.7 : 1
                        }}
                    >
                        {isSubmitting ? 'Verifying...' : 'Continue'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#666' }}>
                    <p>Don't have a firm code?</p>
                    <Link href="/register" style={{ color: '#2563eb', textDecoration: 'none' }}>
                        Create a new Firm Workspace
                    </Link>
                </div>
            </div>
        </div>
    );
}
