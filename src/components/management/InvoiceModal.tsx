"use client";

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, FileText, DollarSign, Loader, Download, CreditCard, AlertCircle, Settings } from 'lucide-react';
import { createInvoice, generateInvoiceNumber, getClientMatters, getClientInvoices } from '@/app/actions/invoices';
import { getBankAccountsWithWorkspaceName } from '@/app/actions/bank-accounts';
import { getWorkspaceMembers } from '@/app/actions/members';
import { generateInvoicePDF } from '@/lib/invoice-pdf';
import styles from './InvoiceModal.module.css';
import { Matter, Invoice } from '@/types/legal';

interface InvoiceItem {
    description: string;
    amount: number;
    quantity: number;
}

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientName: string;
    clientId: string;
    workspaceId: string;
    letterheadUrl?: string | null;
    onRecordPayment?: (invoice: any) => void;
}

const InvoiceModal = ({ isOpen, onClose, clientName, clientId, workspaceId, letterheadUrl, onRecordPayment }: InvoiceModalProps) => {
    const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
    const [items, setItems] = useState<InvoiceItem[]>([{ description: '', amount: 0, quantity: 1 }]);
    const [vatRate, setVatRate] = useState(7.5);
    const [securityChargeRate, setSecurityChargeRate] = useState(1.0);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [matters, setMatters] = useState<any[]>([]);
    const [selectedMatterId, setSelectedMatterId] = useState('');

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);

    // Bill To
    const [billToName, setBillToName] = useState('');
    const [dueDate, setDueDate] = useState('');

    // Bank & Signatory
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [signatories, setSignatories] = useState<any[]>([]);
    const [selectedBankId, setSelectedBankId] = useState('');
    const [selectedSignatoryId, setSelectedSignatoryId] = useState('');
    const [workspaceName, setWorkspaceName] = useState('');

    // Manual bank entry (when no accounts saved)
    const [manualBankName, setManualBankName] = useState('');
    const [manualAccountNumber, setManualAccountNumber] = useState('');
    const [manualAccountName, setManualAccountName] = useState('');

    // Initialize bill-to and invoice number on open
    useEffect(() => {
        if (isOpen) {
            setBillToName(clientName);
            generateInvoiceNumber(workspaceId).then(setInvoiceNumber).catch(() => {});
        }
    }, [isOpen, clientName, workspaceId]);

    // Fetch banks, signatories, matters on open
    useEffect(() => {
        if (isOpen && workspaceId) {
            const loadData = async () => {
                try {
                    const [banksRes, membersRes, mattersRes] = await Promise.all([
                        getBankAccountsWithWorkspaceName(workspaceId),
                        getWorkspaceMembers(workspaceId),
                        getClientMatters(clientId),
                    ]);

                    if (banksRes.success) {
                        setBankAccounts(banksRes.accounts);
                        setWorkspaceName(banksRes.workspaceName);
                        if (banksRes.accounts.length > 0) {
                            setSelectedBankId(banksRes.accounts[0].id);
                        } else {
                            // Pre-fill account name with firm name for manual entry
                            setManualAccountName(banksRes.workspaceName);
                        }
                    }
                    if (membersRes.success && membersRes.data) {
                        setSignatories(membersRes.data);
                        if (membersRes.data.length > 0) setSelectedSignatoryId(membersRes.data[0].id);
                    }
                    if (mattersRes.success && mattersRes.data) {
                        setMatters(mattersRes.data);
                    }
                } catch (error) {
                    console.error('Failed to load form data', error);
                }
            };
            loadData();
        }
    }, [isOpen, workspaceId, clientId]);

    // Fetch invoices whenever the list tab is active
    useEffect(() => {
        if (activeTab === 'list' && isOpen) {
            fetchInvoices();
        }
    }, [activeTab, isOpen]);

    const fetchInvoices = async () => {
        setIsLoadingInvoices(true);
        try {
            const result = await getClientInvoices(clientId);
            if (result.success && result.data) {
                setInvoices(result.data as any);
            }
        } catch (error) {
            console.error('Failed to fetch invoices', error);
        } finally {
            setIsLoadingInvoices(false);
        }
    };

    const addItem = () => setItems([...items, { description: '', amount: 0, quantity: 1 }]);
    const removeItem = (index: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };
    const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + (Number(item.amount || 0) * Number(item.quantity || 1) || 0), 0);
        const vat = subtotal * (vatRate / 100);
        const securityCharge = subtotal * (securityChargeRate / 100);
        return {
            subtotal: Number(subtotal.toFixed(2)),
            vat: Number(vat.toFixed(2)),
            securityCharge: Number(securityCharge.toFixed(2)),
            total: Number((subtotal + vat + securityCharge).toFixed(2)),
        };
    };

    const formatCurrency = (amount: number) =>
        `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const formatCurrencyFromKobo = (amount: number | string) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `₦${num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Returns the active bank details regardless of saved or manual entry
    const getActiveBankDetails = () => {
        if (selectedBankId) return bankAccounts.find(b => b.id === selectedBankId) || null;
        if (manualAccountNumber.trim() && manualAccountName.trim()) {
            return { bankName: manualBankName.trim() || '—', accountNumber: manualAccountNumber.trim(), accountName: manualAccountName.trim() };
        }
        return null;
    };

    const isBankSet = () => !!getActiveBankDetails();

    const resetForm = () => {
        setItems([{ description: '', amount: 0, quantity: 1 }]);
        setBillToName(clientName);
        setDueDate('');
        setSelectedMatterId('');
        generateInvoiceNumber(workspaceId).then(setInvoiceNumber).catch(() => {});
    };

    const saveDraft = async (): Promise<any> => {
        setIsSubmitting(true);
        const bank = getActiveBankDetails();
        const signatory = signatories.find(s => s.id === selectedSignatoryId);

        let finalNotes = '';
        if (bank) {
            finalNotes += `PAYMENT DETAILS:\nAccount Name: ${bank.accountName}\nBank: ${bank.bankName}\nAccount Number: ${bank.accountNumber}`;
        }
        if (signatory) {
            finalNotes += `\n\nSigned by: ${signatory.name}${signatory.jobTitle ? ' (' + signatory.jobTitle + ')' : ''}`;
        }

        try {
            const result = await createInvoice({
                clientId,
                matterId: selectedMatterId || undefined,
                billToName,
                notes: finalNotes,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                items: items.map((item, index) => ({
                    description: item.description,
                    amount: Number(item.amount),
                    quantity: Number(item.quantity),
                    order: index,
                })),
                vatRate,
                securityChargeRate,
            });

            if (result.success) return result.data;
            alert(`Error: ${result.error}`);
            return null;
        } catch (error) {
            console.error('Error creating invoice:', error);
            alert('Failed to create invoice');
            return null;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isBankSet()) {
            alert('A payment account is required before generating an invoice. Please select a saved account or enter account details.');
            return;
        }
        const invoice = await saveDraft();
        if (invoice) {
            resetForm();
            // Switch to list tab so user can see (and download) the new invoice
            setActiveTab('list');
        }
    };

    const buildPdfData = (invoiceToUse: any, bank: any, signatory: any) => {
        let subtotal = 0;
        const pdfItems = invoiceToUse.items.map((item: any) => {
            const q = Number(item.quantity);
            const a = Number(item.amount);
            subtotal += a * q;
            return { description: item.description, quantity: q, amount: a };
        });
        const vat = subtotal * 0.075;
        const security = subtotal * 0.01;
        return {
            invoiceNumber: invoiceToUse.invoiceNumber,
            date: new Date(invoiceToUse.createdAt),
            dueDate: invoiceToUse.dueDate ? new Date(invoiceToUse.dueDate) : undefined,
            billTo: { name: invoiceToUse.billToName },
            items: pdfItems,
            totals: { subtotal, vat, securityCharge: security, total: invoiceToUse.totalAmount },
            bankDetails: bank,
            signatory,
            letterheadUrl,
        };
    };

    const handleDownloadPDF = async (invoice: Invoice | null) => {
        let invoiceToUse = invoice;
        if (!invoiceToUse) {
            if (!isBankSet()) {
                alert('Please enter payment account details before generating the invoice.');
                return;
            }
            const saved = await saveDraft();
            if (!saved) return;
            invoiceToUse = saved;
        }
        const targetId = (invoiceToUse as any).id;
        setIsGeneratingPdf(targetId);
        try {
            const bank = bankAccounts.find(b => b.id === selectedBankId) || getActiveBankDetails();
            const signatory = signatories.find(s => s.id === selectedSignatoryId);
            const data = buildPdfData(invoiceToUse, bank, signatory);
            const pdfBlob = await generateInvoicePDF(data);
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url; a.download = `Invoice-${data.invoiceNumber}.pdf`;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a); URL.revokeObjectURL(url);
            if (!invoice) { resetForm(); setActiveTab('list'); }
        } catch (error) {
            console.error('Failed to generate PDF', error);
            alert('Failed to generate PDF');
        } finally {
            setIsGeneratingPdf(null);
        }
    };

    const totals = calculateTotals();

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Invoice Management</h2>
                        <p className={styles.subtitle}>{clientName}</p>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn} disabled={isSubmitting}><X size={20} /></button>
                </div>

                <div className={styles.tabs}>
                    <button className={`${styles.tab} ${activeTab === 'create' ? styles.tabActive : ''}`} onClick={() => setActiveTab('create')} disabled={isSubmitting}>
                        <Plus size={16} /> Create Invoice
                    </button>
                    <button className={`${styles.tab} ${activeTab === 'list' ? styles.tabActive : ''}`} onClick={() => setActiveTab('list')} disabled={isSubmitting}>
                        <FileText size={16} /> View Invoices
                    </button>
                </div>

                <div className={styles.content}>
                    {/* ── CREATE TAB ── */}
                    {activeTab === 'create' && (
                        <form className={styles.createForm} onSubmit={handleSubmit}>

                            {/* Invoice Number + Due Date */}
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Invoice Number</label>
                                    <input type="text" className={styles.input} value={invoiceNumber} disabled style={{ background: 'var(--surface-subtle)', cursor: 'not-allowed', opacity: 0.7 }} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Due Date</label>
                                    <input type="date" className={styles.input} value={dueDate} onChange={e => setDueDate(e.target.value)} disabled={isSubmitting} />
                                </div>
                            </div>

                            {/* Signatory + Payment Account */}
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Authorized Signatory</label>
                                    <select className={styles.input} value={selectedSignatoryId} onChange={e => setSelectedSignatoryId(e.target.value)} disabled={isSubmitting}>
                                        <option value="">Select Signatory...</option>
                                        {signatories.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}{s.jobTitle ? ` (${s.jobTitle})` : ''}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Payment Account — smart: dropdown if saved, manual entry if not */}
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        Payment Account <span style={{ color: 'var(--danger)' }}>*</span>
                                    </label>
                                    {bankAccounts.length > 0 ? (
                                        <select
                                            className={`${styles.input} ${!selectedBankId ? styles.inputError : ''}`}
                                            value={selectedBankId}
                                            onChange={e => setSelectedBankId(e.target.value)}
                                            disabled={isSubmitting}
                                            required
                                        >
                                            <option value="">— Select account —</option>
                                            {bankAccounts.map(b => (
                                                <option key={b.id} value={b.id}>
                                                    {b.accountName} · {b.bankName} · {b.accountNumber}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className={styles.manualBankEntry}>
                                            <div className={styles.bankWarning}>
                                                <AlertCircle size={13} />
                                                <span>No bank account saved in Settings.</span>
                                                <a href="/management/settings" target="_blank" rel="noopener noreferrer" className={styles.bankLink}>
                                                    <Settings size={11} /> Add one
                                                </a>
                                            </div>
                                            <input className={styles.input} placeholder={`Account Name (e.g. ${workspaceName || 'Firm Name'})`} value={manualAccountName} onChange={e => setManualAccountName(e.target.value)} disabled={isSubmitting} required />
                                            <input className={styles.input} placeholder="Bank Name (e.g. GTBank)" value={manualBankName} onChange={e => setManualBankName(e.target.value)} disabled={isSubmitting} style={{ marginTop: '0.375rem' }} />
                                            <input className={styles.input} placeholder="Account Number" value={manualAccountNumber} onChange={e => setManualAccountNumber(e.target.value)} disabled={isSubmitting} style={{ marginTop: '0.375rem' }} required />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Link to Matter */}
                            {matters.length > 0 && (
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Link to Matter (Optional)</label>
                                    <select className={styles.input} value={selectedMatterId} onChange={e => setSelectedMatterId(e.target.value)} disabled={isSubmitting}>
                                        <option value="">No matter selected</option>
                                        {matters.map(m => <option key={m.id} value={m.id}>{m.caseNumber} — {m.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* Bill To */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Bill To *</label>
                                <input
                                    className={styles.input}
                                    value={billToName}
                                    onChange={e => setBillToName(e.target.value)}
                                    placeholder="e.g. The Managing Director, Arete Protea Global Services Ltd"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Line Items */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Line Items</label>
                                <div className={styles.lineItems}>
                                    {items.map((item, index) => (
                                        <div key={index} className={styles.lineItem}>
                                            <div className={styles.lineItemNumber}>{index + 1}.</div>
                                            <div className={styles.lineItemContent}>
                                                <textarea
                                                    className={styles.textarea}
                                                    value={item.description}
                                                    onChange={e => updateItem(index, 'description', e.target.value)}
                                                    placeholder="Service description"
                                                    rows={2}
                                                    required
                                                    disabled={isSubmitting}
                                                />
                                                <div className={styles.formRow}>
                                                    <input
                                                        type="number"
                                                        className={styles.input}
                                                        value={item.amount || ''}
                                                        onChange={e => updateItem(index, 'amount', parseFloat(e.target.value) || 0)}
                                                        placeholder="Amount (₦)"
                                                        step="0.01"
                                                        required
                                                        disabled={isSubmitting}
                                                    />
                                                    <input
                                                        type="number"
                                                        className={styles.input}
                                                        value={item.quantity}
                                                        onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                                        placeholder="Qty"
                                                        min="1"
                                                        required
                                                        style={{ maxWidth: '100px' }}
                                                        disabled={isSubmitting}
                                                    />
                                                </div>
                                            </div>
                                            {items.length > 1 && (
                                                <button type="button" onClick={() => removeItem(index)} className={styles.removeItemBtn} disabled={isSubmitting}>
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={addItem} className={styles.addItemBtn} disabled={isSubmitting}>
                                    <Plus size={16} /> Add Line Item
                                </button>
                            </div>

                            {/* Tax rates */}
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>VAT (%)</label>
                                    <input type="number" className={styles.input} value={vatRate} onChange={e => setVatRate(parseFloat(e.target.value) || 0)} step="0.1" disabled={isSubmitting} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Security Charge (%)</label>
                                    <input type="number" className={styles.input} value={securityChargeRate} onChange={e => setSecurityChargeRate(parseFloat(e.target.value) || 0)} step="0.1" disabled={isSubmitting} />
                                </div>
                            </div>

                            {/* Totals */}
                            <div className={styles.totalsBox}>
                                <div className={styles.totalRow}><span>Subtotal:</span><span>{formatCurrency(totals.subtotal)}</span></div>
                                <div className={styles.totalRow}><span>VAT ({vatRate}%):</span><span>{formatCurrency(totals.vat)}</span></div>
                                <div className={styles.totalRow}><span>Security Charges ({securityChargeRate}%):</span><span>{formatCurrency(totals.securityCharge)}</span></div>
                                <div className={`${styles.totalRow} ${styles.grandTotal}`}><span>TOTAL:</span><span>{formatCurrency(totals.total)}</span></div>
                            </div>

                            {/* Footer Actions */}
                            <div className={styles.formActions}>
                                <button type="button" className={styles.secondaryActionBtn} onClick={() => handleDownloadPDF(null)} disabled={!!isGeneratingPdf || isSubmitting}>
                                    {isGeneratingPdf ? <Loader className="spin" size={16} /> : <Download size={16} />} PDF Preview
                                </button>
                                <div style={{ flex: 1 }} />
                                <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>Cancel</button>
                                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                                    {isSubmitting ? <><Loader size={18} className="spin" /> Creating...</> : <><DollarSign size={18} /> Create Invoice</>}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ── LIST TAB ── */}
                    {activeTab === 'list' && (
                        <div className={styles.invoiceList}>
                            {isLoadingInvoices ? (
                                <div className={styles.skeletonList}>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={styles.skeletonCard}>
                                            <div className={styles.skeletonRow}>
                                                <div className={styles.skeletonBlock} style={{ width: '40%', height: 18 }} />
                                                <div className={styles.skeletonBlock} style={{ width: '25%', height: 18 }} />
                                            </div>
                                            <div className={styles.skeletonBlock} style={{ width: '60%', height: 13, marginTop: 8 }} />
                                        </div>
                                    ))}
                                </div>
                            ) : invoices.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                    <FileText size={40} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                                    <p style={{ fontWeight: 500 }}>No invoices yet for this client.</p>
                                    <button className={styles.tab} style={{ marginTop: '1rem' }} onClick={() => setActiveTab('create')}>Create one →</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {invoices.map(invoice => (
                                        <div key={invoice.id} className={styles.invoiceCard}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <div>
                                                    <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{invoice.invoiceNumber}</h3>
                                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                        {new Date(invoice.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{formatCurrencyFromKobo(invoice.totalAmount)}</p>
                                                    <span style={{
                                                        fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                                                        color: invoice.status === 'paid' || invoice.status === 'PAID' ? 'var(--success)' : invoice.status === 'overdue' || invoice.status === 'OVERDUE' ? 'var(--danger)' : 'var(--warning)',
                                                    }}>
                                                        {invoice.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'var(--surface-subtle)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                                                <div>
                                                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem' }}>PAID</span>
                                                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrencyFromKobo((invoice as any).paidAmount || 0)}</span>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem' }}>OUTSTANDING</span>
                                                    <span style={{ fontWeight: 700, color: (invoice.totalAmount as any) - ((invoice as any).paidAmount || 0) <= 0 ? 'var(--text-secondary)' : 'var(--danger)' }}>
                                                        {formatCurrencyFromKobo((invoice.totalAmount as any) - ((invoice as any).paidAmount || 0))}
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button onClick={() => handleDownloadPDF(invoice)} className={styles.secondaryActionBtn} disabled={isGeneratingPdf === invoice.id}>
                                                    {isGeneratingPdf === invoice.id ? <Loader size={13} className="spin" /> : <Download size={13} />} PDF
                                                </button>
                                                {(invoice.status !== 'paid' && invoice.status !== 'PAID') && onRecordPayment && (
                                                    <button onClick={() => onRecordPayment(invoice)} className={styles.submitBtn} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                                                        <CreditCard size={13} /> Pay
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvoiceModal;
