'use client';

import { useFormState } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { registerMember, FirmLoginState } from '@/app/actions/firm-auth';
import styles from '../page.module.css'; // Reusing styles

const initialState: FirmLoginState = {};

const DESIGNATIONS = [
    "Managing Partner",
    "Partner",
    "Head of Chambers",
    "Deputy Head of Chambers",
    "Senior Associate",
    "Practice Manager",
    "Litigation Officer",
    "Associate",
    "Intern"
];

export default function RegisterMemberPage() {
    const searchParams = useSearchParams();
    const firmId = searchParams.get('firmId');
    const firmName = searchParams.get('firmName');

    const [state, formAction] = useFormState(registerMember, initialState);
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!firmId) {
            router.push('/join-firm');
        }
    }, [firmId, router]);

    useEffect(() => {
        if (state.success) {
            // Redirect to login or success page
            // Ideally notify user they need approval
            router.push('/login?joined=true');
        } else {
            setIsSubmitting(false);
        }
    }, [state, router]);

    return (
        <div className={styles.container} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', padding: '2rem 0' }}>
            <div className={styles.card} style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                maxWidth: '500px',
                width: '100%'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1a1a1a' }}>Join {firmName || 'Firm'}</h1>
                    <p style={{ color: '#666', marginTop: '0.5rem' }}>Create your profile to request access</p>
                </div>

                <form action={formAction} onSubmit={() => setIsSubmitting(true)}>
                    <input type="hidden" name="firmId" value={firmId || ''} />

                    {state.errors?._form && (
                        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                            {state.errors._form[0]}
                        </div>
                    )}

                    {/* Name */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Full Name *</label>
                        <input name="name" type="text" required className={styles.input} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '4px' }} />
                    </div>

                    {/* Email */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Email Address *</label>
                        <input name="email" type="email" required className={styles.input} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '4px' }} />
                        {state.errors?.email && <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>{state.errors.email[0]}</p>}
                    </div>

                    {/* Phone */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Phone Number *</label>
                        <input name="phone" type="tel" required className={styles.input} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '4px' }} />
                    </div>

                    {/* Designation */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Designation *</label>
                        <select name="designation" required style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '4px', background: 'white' }}>
                            <option value="">Select your role...</option>
                            {DESIGNATIONS.map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Create Password *</label>
                        <input name="password" type="password" required minLength={6} className={styles.input} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '4px' }} />
                        {state.errors?.password && <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>{state.errors.password[0]}</p>}
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
                            marginTop: '1rem',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            opacity: isSubmitting ? 0.7 : 1
                        }}
                    >
                        {isSubmitting ? 'Creating Profile...' : 'Complete Registration'}
                    </button>
                </form>
            </div>
        </div>
    );
}
