"use client";

import { useState, useEffect } from 'react';
import { X, Loader, DollarSign, CheckCircle, Download, FileText } from 'lucide-react';
import { getInvoices } from '@/app/actions/invoices';
import { createPayment } from '@/app/actions/payments';
import { getBankAccounts } from '@/app/actions/bank-accounts';
import { generateInvoicePDF } from '@/lib/invoice-pdf';
import { generateInvoiceDOCX } from '@/lib/invoice-docx';
import styles from './ViewAllModal.module.css';

interface Invoice {
    id: string;
    invoiceNumber: string;
    totalAmount: any;
    status: string;
    createdAt: Date;
    dueDate?: Date | null;
    billToName?: string | null;
    clientId: string;
    client: { name: string };
    matter?: { name: string } | null;
    payments?: any[];
    items?: any[];
}

interface ViewAllInvoicesModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    letterheadUrl?: string | null;
}

const ViewAllInvoicesModal = ({ isOpen, onClose, workspaceId, letterheadUrl }: ViewAllInvoicesModalProps) => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [recordingPaymentFor, setRecordingPaymentFor] = useState<string | null>(null);
    const [paymentMode, setPaymentMode] = useState<'full' | 'vary'>('full');
    const [customAmount, setCustomAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
    const [paymentReference, setPaymentReference] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) fetchAll();
    }, [isOpen, workspaceId]);

    const fetchAll = async () => {
        setIsLoading(true);
        try {
            const [invoicesRes, banksRes] = await Promise.all([
                getInvoices(workspaceId),
                getBankAccounts(workspaceId),
            ]);
            if (invoicesRes.success && invoicesRes.data) setInvoices(invoicesRes.data as any);
            if (banksRes.success) setBankAccounts(banksRes.accounts || []);
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number | string) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
        return `₦${(num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (date: Date | null | undefined) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, [string, string]> = {
            paid: ['#059669', '#D1FAE5'], pending: ['#D97706', '#FEF3C7'],
            overdue: ['#DC2626', '#FEE2E2'], partially_paid: ['#2563EB', '#DBEAFE'],
        };
        const [color, bg] = map[status.toLowerCase()] || ['#6B7280', '#F3F4F6'];
        return (
            <span style={{ padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, background: bg, color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    const getOutstanding = (invoice: Invoice) => {
        const paid = invoice.payments?.reduce((s, p) => s + (typeof p.amount === 'string' ? parseFloat(p.amount) : p.amount || 0), 0) || 0;
        return (typeof invoice.totalAmount === 'string' ? parseFloat(invoice.totalAmount) : Number(invoice.totalAmount)) - paid;
    };

    const handleDownloadPDF = async (invoice: Invoice) => {
        setGeneratingPdf(invoice.id + '-pdf');
        try {
            const bank = bankAccounts[0];
            let subtotal = 0;
            const items = (invoice.items || []).map((item: any) => {
                const q = Number(item.quantity); const a = Number(item.amount);
                subtotal += a * q;
                return { description: item.description, quantity: q, amount: a };
            });
            const vat = subtotal * 0.075; const security = subtotal * 0.01;
            const blob = await generateInvoicePDF({
                invoiceNumber: invoice.invoiceNumber,
                date: new Date(invoice.createdAt),
                dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
                billTo: { name: invoice.billToName || invoice.client.name },
                items,
                totals: { subtotal, vat, securityCharge: security, total: invoice.totalAmount },
                bankDetails: bank,
                letterheadUrl,
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `Invoice-${invoice.invoiceNumber}.pdf`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        } catch (e) { console.error(e); alert('Failed to generate PDF'); }
        finally { setGeneratingPdf(null); }
    };

    const handleDownloadDOCX = async (invoice: Invoice) => {
        setGeneratingPdf(invoice.id + '-docx');
        try {
            const bank = bankAccounts[0];
            let subtotal = 0;
            const items = (invoice.items || []).map((item: any) => {
                const q = Number(item.quantity); const a = Number(item.amount);
                subtotal += a * q;
                return { description: item.description, quantity: q, amount: a };
            });
            const vat = subtotal * 0.075; const security = subtotal * 0.01;
            const blob = await generateInvoiceDOCX({
                invoiceNumber: invoice.invoiceNumber,
                date: new Date(invoice.createdAt),
                dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
                billTo: { name: invoice.billToName || invoice.client.name },
                items,
                totals: { subtotal, vat, securityCharge: security, total: invoice.totalAmount },
                bankDetails: bank,
                letterheadUrl,
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `Invoice-${invoice.invoiceNumber}.docx`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        } catch (e) { console.error(e); alert('Failed to generate Word doc'); }
        finally { setGeneratingPdf(null); }
    };

    const handleRecordPayment = (invoice: Invoice) => {
        setRecordingPaymentFor(invoice.id);
        setPaymentMode('full'); setCustomAmount(''); setPaymentMethod('Bank Transfer'); setPaymentReference('');
    };
    const handleCancelPayment = () => { setRecordingPaymentFor(null); };

    const handleSubmitPayment = async (invoice: Invoice) => {
        setIsSubmitting(true);
        try {
            const outstanding = getOutstanding(invoice);
            let amount = paymentMode === 'full' ? outstanding : parseFloat(customAmount);
            if (isNaN(amount) || amount <= 0) { alert('Enter a valid amount'); setIsSubmitting(false); return; }
            const result = await createPayment({ invoiceId: invoice.id, clientId: invoice.clientId, amount, method: paymentMethod, reference: paymentReference || undefined, date: new Date() });
            if (result.success) { handleCancelPayment(); fetchAll(); }
            else alert(result.error || 'Failed to record payment');
        } catch (e) { console.error(e); alert('Failed to record payment'); }
        finally { setIsSubmitting(false); }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>All Invoices</h2>
                    <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
                </div>

                <div className={styles.content}>
                    {isLoading ? (
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead><tr><th>Invoice #</th><th>Client</th><th>Matter</th><th>Amount</th><th>Status</th><th>Date</th><th>Due Date</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {[1,2,3,4,5].map(i => (
                                        <tr key={i}>
                                            {[28,40,35,30,25,28,28,40].map((w,j) => (
                                                <td key={j}><div style={{ height: 14, width: `${w + i * 4}%`, borderRadius: 4, background: 'linear-gradient(90deg,var(--bg-secondary) 25%,var(--bg-primary) 50%,var(--bg-secondary) 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.4s infinite linear' }} /></td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className={styles.empty}><p>No invoices found</p></div>
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Invoice #</th><th>Client</th><th>Matter</th><th>Amount</th>
                                        <th>Status</th><th>Date</th><th>Due Date</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map(invoice => (
                                        <>
                                            <tr key={invoice.id}>
                                                <td className={styles.invoiceNumber}>{invoice.invoiceNumber}</td>
                                                <td>{invoice.client.name}</td>
                                                <td>{invoice.matter?.name || '—'}</td>
                                                <td className={styles.amount}>{formatCurrency(invoice.totalAmount)}</td>
                                                <td>{getStatusBadge(invoice.status)}</td>
                                                <td>{formatDate(invoice.createdAt)}</td>
                                                <td>{formatDate(invoice.dueDate)}</td>
                                                <td>
                                                    <div className={styles.actionsCell}>
                                                        <button onClick={() => handleDownloadPDF(invoice)} className={styles.downloadBtn} disabled={generatingPdf === invoice.id + '-pdf'} title="Download PDF">
                                                            {generatingPdf === invoice.id + '-pdf' ? <Loader size={12} className="spin" /> : <Download size={12} />} PDF
                                                        </button>
                                                        <button onClick={() => handleDownloadDOCX(invoice)} className={styles.downloadBtn} disabled={generatingPdf === invoice.id + '-docx'} title="Download Word">
                                                            {generatingPdf === invoice.id + '-docx' ? <Loader size={12} className="spin" /> : <FileText size={12} />} Word
                                                        </button>
                                                        {invoice.status !== 'paid' && (
                                                            <button onClick={() => handleRecordPayment(invoice)} className={styles.actionBtn} disabled={recordingPaymentFor === invoice.id}>
                                                                <DollarSign size={13} /> Record Payment
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {recordingPaymentFor === invoice.id && (
                                                <tr key={invoice.id + '-pay'}>
                                                    <td colSpan={8} className={styles.paymentForm}>
                                                        <div className={styles.paymentFormContent}>
                                                            <h4>Record Payment — {invoice.invoiceNumber}</h4>
                                                            <p className={styles.outstandingInfo}>Outstanding: <strong>{formatCurrency(getOutstanding(invoice))}</strong></p>
                                                            <div className={styles.paymentModeButtons}>
                                                                <button className={paymentMode === 'full' ? styles.modeActive : styles.modeInactive} onClick={() => setPaymentMode('full')}>
                                                                    <CheckCircle size={14} /> Full Payment
                                                                </button>
                                                                <button className={paymentMode === 'vary' ? styles.modeActive : styles.modeInactive} onClick={() => setPaymentMode('vary')}>
                                                                    Vary Amount
                                                                </button>
                                                            </div>
                                                            {paymentMode === 'vary' && (
                                                                <div className={styles.formGroup}>
                                                                    <label>Amount (₦)</label>
                                                                    <input type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder="Enter amount" className={styles.input} />
                                                                </div>
                                                            )}
                                                            <div className={styles.formGroup}>
                                                                <label>Payment Method</label>
                                                                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={styles.select}>
                                                                    {['Bank Transfer','Cash','Cheque','Card','Mobile Money','Other'].map(m => <option key={m} value={m}>{m}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className={styles.formGroup}>
                                                                <label>Reference (Optional)</label>
                                                                <input type="text" value={paymentReference} onChange={e => setPaymentReference(e.target.value)} placeholder="Transaction reference" className={styles.input} />
                                                            </div>
                                                            <div className={styles.formActions}>
                                                                <button onClick={() => handleSubmitPayment(invoice)} disabled={isSubmitting} className={styles.submitBtn}>
                                                                    {isSubmitting ? <Loader size={14} className="spin" /> : 'Submit Payment'}
                                                                </button>
                                                                <button onClick={handleCancelPayment} disabled={isSubmitting} className={styles.cancelBtn}>Cancel</button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ViewAllInvoicesModal;
