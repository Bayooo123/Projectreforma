'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import styles from './CreateInvoice.module.css';
import { createInvoice } from '@/app/actions/invoices';

interface LineItem { description: string; amount: string; quantity: string; }
interface Props {
    workspaceId: string;
    clients: { id: string; name: string; email: string | null; company: string | null }[];
    briefs: { id: string; name: string; briefNumber: string }[];
}

function fmt(n: number) {
    return `₦${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const VAT_RATE = 7.5;

export default function CreateInvoiceClient({ workspaceId, clients, briefs }: Props) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Step 1 state
    const [clientId, setClientId] = useState('');
    const [briefId, setBriefId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');

    // Step 2 state
    const [items, setItems] = useState<LineItem[]>([
        { description: '', amount: '', quantity: '1' },
    ]);
    const [includeVat, setIncludeVat] = useState(true);

    const selectedClient = clients.find(c => c.id === clientId);

    const subtotal = items.reduce((s, i) => {
        const amt = parseFloat(i.amount) || 0;
        const qty = parseFloat(i.quantity) || 1;
        return s + amt * qty;
    }, 0);
    const vatAmount = includeVat ? subtotal * (VAT_RATE / 100) : 0;
    const total = subtotal + vatAmount;

    function addItem() {
        setItems(prev => [...prev, { description: '', amount: '', quantity: '1' }]);
    }

    function removeItem(i: number) {
        setItems(prev => prev.filter((_, idx) => idx !== i));
    }

    function updateItem(i: number, field: keyof LineItem, value: string) {
        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
    }

    function canProceedStep1() {
        return clientId !== '';
    }

    function canProceedStep2() {
        return items.some(i => i.description.trim() && parseFloat(i.amount) > 0);
    }

    async function handleSubmit() {
        if (!canProceedStep2()) return;
        setSubmitting(true);
        setError('');
        try {
            const client = clients.find(c => c.id === clientId);
            const result = await createInvoice({
                clientId,
                matterId: briefId || null,
                billToName: client?.name || '',
                billToAddress: null,
                dueDate: dueDate ? new Date(dueDate) : null,
                notes: notes || null,
                vatRate: includeVat ? VAT_RATE : 0,
                securityChargeRate: 0,
                items: items
                    .filter(i => i.description.trim() && parseFloat(i.amount) > 0)
                    .map((i, idx) => ({
                        description: i.description.trim(),
                        amount: parseFloat(i.amount),
                        quantity: parseFloat(i.quantity) || 1,
                        order: idx,
                    })),
            });

            if (result.success) {
                router.push('/finance');
            } else {
                setError((result as any).error || 'Failed to create invoice');
            }
        } catch (e) {
            setError('An unexpected error occurred');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => step > 1 ? setStep(s => s - 1) : router.back()}>
                    <ChevronLeft size={20} />
                </button>
                <div className={styles.headerContent}>
                    <span className={styles.headerEye}>New Invoice</span>
                    <div className={styles.stepIndicator}>
                        {[1, 2, 3].map(s => (
                            <div key={s} className={`${styles.stepDot} ${step >= s ? styles.stepDotActive : ''}`} />
                        ))}
                    </div>
                </div>
            </div>

            <div className={styles.body}>
                {/* Step 1: Client + Brief */}
                {step === 1 && (
                    <>
                        <h2 className={styles.stepTitle}>Client & matter</h2>

                        <div className={styles.field}>
                            <label className={styles.label}>Client *</label>
                            <select
                                className={styles.select}
                                value={clientId}
                                onChange={e => setClientId(e.target.value)}
                            >
                                <option value="">Select client…</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}{c.company ? ` (${c.company})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Related brief (optional)</label>
                            <select
                                className={styles.select}
                                value={briefId}
                                onChange={e => setBriefId(e.target.value)}
                            >
                                <option value="">None</option>
                                {briefs.map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.briefNumber} — {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Due date (optional)</label>
                            <input
                                type="date"
                                className={styles.input}
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Notes (optional)</label>
                            <textarea
                                className={styles.textarea}
                                placeholder="Any notes for the client…"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </>
                )}

                {/* Step 2: Line items */}
                {step === 2 && (
                    <>
                        <h2 className={styles.stepTitle}>Line items</h2>

                        {items.map((item, i) => (
                            <div key={i} className={styles.lineItemCard}>
                                <div className={styles.lineItemHeader}>
                                    <span className={styles.lineItemNum}>Item {i + 1}</span>
                                    {items.length > 1 && (
                                        <button className={styles.removeBtn} onClick={() => removeItem(i)}>
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="Description *"
                                    value={item.description}
                                    onChange={e => updateItem(i, 'description', e.target.value)}
                                />
                                <div className={styles.row2}>
                                    <div className={styles.field} style={{ flex: 2 }}>
                                        <label className={styles.label}>Amount (₦)</label>
                                        <input
                                            type="number"
                                            className={styles.input}
                                            placeholder="0.00"
                                            value={item.amount}
                                            onChange={e => updateItem(i, 'amount', e.target.value)}
                                        />
                                    </div>
                                    <div className={styles.field} style={{ flex: 1 }}>
                                        <label className={styles.label}>Qty</label>
                                        <input
                                            type="number"
                                            className={styles.input}
                                            placeholder="1"
                                            value={item.quantity}
                                            min="1"
                                            onChange={e => updateItem(i, 'quantity', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button className={styles.addItemBtn} onClick={addItem}>
                            <Plus size={16} /> Add line item
                        </button>

                        <div className={styles.vatToggle}>
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    checked={includeVat}
                                    onChange={e => setIncludeVat(e.target.checked)}
                                />
                                Include VAT ({VAT_RATE}%)
                            </label>
                        </div>

                        <div className={styles.totalsCard}>
                            <div className={styles.totalRow}>
                                <span>Subtotal</span>
                                <span>{fmt(subtotal)}</span>
                            </div>
                            {includeVat && (
                                <div className={styles.totalRow}>
                                    <span>VAT ({VAT_RATE}%)</span>
                                    <span>{fmt(vatAmount)}</span>
                                </div>
                            )}
                            <div className={`${styles.totalRow} ${styles.totalRowFinal}`}>
                                <span>Total</span>
                                <span>{fmt(total)}</span>
                            </div>
                        </div>
                    </>
                )}

                {/* Step 3: Review */}
                {step === 3 && (
                    <>
                        <h2 className={styles.stepTitle}>Review & send</h2>

                        <div className={styles.reviewCard}>
                            <div className={styles.reviewRow}>
                                <span className={styles.reviewLabel}>Client</span>
                                <span className={styles.reviewValue}>{selectedClient?.name}</span>
                            </div>
                            {briefId && (
                                <div className={styles.reviewRow}>
                                    <span className={styles.reviewLabel}>Brief</span>
                                    <span className={styles.reviewValue}>
                                        {briefs.find(b => b.id === briefId)?.briefNumber}
                                    </span>
                                </div>
                            )}
                            {dueDate && (
                                <div className={styles.reviewRow}>
                                    <span className={styles.reviewLabel}>Due date</span>
                                    <span className={styles.reviewValue}>
                                        {new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            )}
                            <div className={styles.reviewRow}>
                                <span className={styles.reviewLabel}>Items</span>
                                <span className={styles.reviewValue}>
                                    {items.filter(i => i.description.trim()).length}
                                </span>
                            </div>
                            <div className={`${styles.reviewRow} ${styles.reviewRowTotal}`}>
                                <span>Total</span>
                                <span>{fmt(total)}</span>
                            </div>
                        </div>

                        {error && <div className={styles.errorMsg}>{error}</div>}
                    </>
                )}
            </div>

            {/* Bottom action */}
            <div className={styles.footer}>
                {step < 3 ? (
                    <button
                        className={styles.primaryBtn}
                        onClick={() => setStep(s => s + 1)}
                        disabled={step === 1 ? !canProceedStep1() : !canProceedStep2()}
                    >
                        Continue
                    </button>
                ) : (
                    <button
                        className={styles.primaryBtn}
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? 'Creating…' : 'Create Invoice'}
                    </button>
                )}
            </div>
        </div>
    );
}
