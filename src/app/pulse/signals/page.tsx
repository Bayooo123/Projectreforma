import { getEmailSignals } from '@/app/actions/signals';
import { SignalCard } from './SignalCard';

export default async function SignalsPage() {
    const signals = await getEmailSignals();

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
            <div style={{ marginBottom: '1.75rem' }}>
                <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: '0 0 0.3rem' }}>
                    Matter Intelligence
                </h1>
                <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0 }}>
                    The last {signals.length} email signals across active matters.
                    Each card shows what happened (past), what arrived (present), and a suggested draft response (future).
                </p>
            </div>

            {signals.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '3rem 1rem',
                    border: '1px dashed #e5e7eb', borderRadius: 10,
                    color: '#9ca3af', fontSize: '0.8rem',
                }}>
                    No unactioned email signals found. Signals appear here when new emails arrive on active matters.
                </div>
            ) : (
                signals.map(signal => (
                    <SignalCard key={signal.id} signal={signal} />
                ))
            )}
        </div>
    );
}
