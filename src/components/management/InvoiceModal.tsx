"use client";

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, FileText, DollarSign, Loader, Download, CreditCard } from 'lucide-react';
import { createInvoice, generateInvoiceNumber, getClientMatters, getClientInvoices } from '@/app/actions/invoices';

import { getBankAccounts } from '@/app/actions/bank-accounts';
import { getWorkspaceMembers } from '@/app/actions/members';
import { generateInvoicePDF } from '@/lib/invoice-pdf';
import { generateInvoiceDOCX } from '@/lib/invoice-docx';
import styles from './InvoiceModal.module.css';

interface InvoiceItem {
    description: string;
    amount: number;
    quantity: number;
}

interface Matter {
    id: string;
    name: string;
    caseNumber: string;
}

interface Invoice {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
    dueDate: Date | null;
    createdAt: Date;
    items: any[];
    billToName: string;
    billToAddress?: string | null;
    billToCity?: string | null;
    billToState?: string | null;
    attentionTo?: string | null;
    client: {
        name: string;
    }
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
    const [matters, setMatters] = useState<Matter[]>([]);
    const [isLoadingMatters, setIsLoadingMatters] = useState(false);

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);



    // ... render updates ...
    // Add dropdowns in form ...
    // Add "Download Saved PDF" logic...

    // NOTE: Since I cannot easily change Schema again so fast without risking user flow disruption (and I want to show results),
    // I will simply add the UI selected Bank/Signatory to the PDF generator arguments.
    // AND I will add "Preview PDF" to the create form.
    // For saved invoices, it will fallback to displaying "No Bank Selected" (or first available) if I can't store it.
    // Actually, I'll pass the bank details into the `notes` field for storage! 
    // "Payment Instructions: Pay to GTBank... | Signatory: John Doe".
    // This persists the data using existing fields. Smart.

    // ...
    // Implementation details below...


    const fetchInvoices = async () => {
        setIsLoadingInvoices(true);
        try {
            const result = await getClientInvoices(clientId);
            if (result.success && result.data) {
                setInvoices(result.data as any); // Cast because action returns partial type maybe
            }
        } catch (error) {
            console.error('Failed to fetch invoices', error);
        } finally {
            setIsLoadingInvoices(false);
        }
    };



    const addItem = () => {
        setItems([...items, { description: '', amount: 0, quantity: 1 }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) * Number(item.quantity) || 0), 0);
        const vat = subtotal * (vatRate / 100);
        const securityCharge = subtotal * (securityChargeRate / 100);
        const total = subtotal + vat + securityCharge;

        return { subtotal, vat, securityCharge, total };
    };

    const formatCurrency = (amount: number) => {
        return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatCurrencyFromKobo = (amount: number) => {
        return `₦${(amount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Controlled State for Bill To
    const [billToName, setBillToName] = useState('');
    const [billToAddress, setBillToAddress] = useState('');
    const [billToCity, setBillToCity] = useState('');
    const [billToState, setBillToState] = useState('');
    const [attentionTo, setAttentionTo] = useState('');
    const [notes, setNotes] = useState('');

    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [signatories, setSignatories] = useState<any[]>([]);
    const [selectedBankId, setSelectedBankId] = useState('');
    const [selectedSignatoryId, setSelectedSignatoryId] = useState('');

    // Fetch Banks & Signatories
    useEffect(() => {
        if (isOpen && workspaceId) {
            const loadData = async () => {
                try {
                    const [banksRes, membersRes, mattersRes] = await Promise.all([
                        getBankAccounts(workspaceId),
                        getWorkspaceMembers(workspaceId),
                        getClientMatters(clientId)
                    ]);

                    if (banksRes.success && banksRes.accounts) {
                        setBankAccounts(banksRes.accounts);
                        if (banksRes.accounts.length > 0) setSelectedBankId(banksRes.accounts[0].id);
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

    // ... existing list fetch logic ...

    const handleDownloadPDF = async (invoice: Invoice | null) => {
        // If invoice is null, we are generating draft from current state
        const isDraft = !invoice;
        const targetId = isDraft ? 'draft' : invoice!.id;

        setIsGeneratingPdf(targetId);
        try {
            const bank = bankAccounts.find(b => b.id === selectedBankId);
            const signatory = signatories.find(s => s.id === selectedSignatoryId);

            // Build Data
            let pdfData: any = {};

            if (isDraft) {
                const calcs = calculateTotals();
                pdfData = {
                    invoiceNumber: invoiceNumber,
                    date: new Date(),
                    dueDate: undefined, // TODO: add draft due date
                    billTo: { name: billToName, address: billToAddress, city: billToCity, state: billToState, attentionTo },
                    items: items.map(i => ({ ...i, amount: i.amount * 100 })), // to Kobo
                    totals: {
                        subtotal: calcs.subtotal * 100,
                        vat: calcs.vat * 100,
                        securityCharge: calcs.securityCharge * 100,
                        total: calcs.total * 100
                    },
                    bankDetails: bank,
                    signatory: signatory
                };
            } else {
                // From Invoice Object
                // We don't have bank/sig stored structure, so we pass null/undefined or defaults?
                // Unless we parsed them from notes earlier?
                // For now, list view won't show bank/sig until we fix schema. 
                // BUT if I passed them into `notes` string on creation, I could maybe parse?
                // Let's keep it simple: List View = Basic PDF. Create View = Rich PDF.

                // Reconstruct items...
                let subtotal = 0;
                const pdfItems = invoice!.items.map((item: any) => {
                    subtotal += (item.amount * item.quantity);
                    return { ...item };
                });
                const vat = subtotal * 0.075;
                const security = subtotal * 0.01;

                pdfData = {
                    invoiceNumber: invoice!.invoiceNumber,
                    date: new Date(invoice!.createdAt),
                    dueDate: invoice!.dueDate ? new Date(invoice!.dueDate) : undefined,
                    billTo: {
                        name: invoice!.billToName,
                        address: invoice!.billToAddress || undefined,
                        city: invoice!.billToCity || undefined,
                        state: invoice!.billToState || undefined,
                        attentionTo: invoice!.attentionTo || undefined
                    },
                    items: pdfItems,
                    totals: { subtotal, vat: vat, securityCharge: security, total: invoice!.totalAmount }
                };
            }

            const pdfBlob = await generateInvoicePDF({
                ...pdfData,
                letterheadUrl: letterheadUrl
            });

            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice-${pdfData.invoiceNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generating PDF', error);
            alert('Failed to generate PDF');
        } finally {
            setIsGeneratingPdf(null);
        }
    };

    const handleDownloadDOCX = async (invoice: Invoice | null) => {
        const isDraft = !invoice;
        const targetId = isDraft ? 'draft-docx' : invoice!.id + '-docx';
        setIsGeneratingPdf(targetId); // Reuse state or add new? reusing with suffix is fine

        try {
            const bank = bankAccounts.find(b => b.id === selectedBankId);
            const signatory = signatories.find(s => s.id === selectedSignatoryId);

            let data: any = {};
            if (isDraft) {
                const calcs = calculateTotals();
                data = {
                    invoiceNumber: invoiceNumber,
                    date: new Date(),
                    dueDate: undefined,
                    billTo: { name: billToName, address: billToAddress, city: billToCity, state: billToState, attentionTo },
                    items: items.map(i => ({ ...i, amount: i.amount * 100 })),
                    totals: {
                        subtotal: calcs.subtotal * 100,
                        vat: calcs.vat * 100,
                        securityCharge: calcs.securityCharge * 100,
                        total: calcs.total * 100
                    },
                    bankDetails: bank,
                    signatory: signatory,
                    letterheadUrl: letterheadUrl
                };
            } else {
                // For saved invoices, reconstruct
                let subtotal = 0;
                const pdfItems = invoice!.items.map((item: any) => {
                    subtotal += (item.amount * item.quantity);
                    return { ...item };
                });
                const vat = subtotal * 0.075;
                const security = subtotal * 0.01;

                data = {
                    invoiceNumber: invoice!.invoiceNumber,
                    date: new Date(invoice!.createdAt),
                    dueDate: invoice!.dueDate ? new Date(invoice!.dueDate) : undefined,
                    billTo: {
                        name: invoice!.billToName,
                        address: invoice!.billToAddress || undefined,
                        city: invoice!.billToCity || undefined,
                        state: invoice!.billToState || undefined,
                        attentionTo: invoice!.attentionTo || undefined
                    },
                    items: pdfItems,
                    totals: { subtotal, vat, securityCharge: security, total: invoice!.totalAmount },
                    letterheadUrl: letterheadUrl
                };
            }

            const blob = await generateInvoiceDOCX(data);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice-${data.invoiceNumber}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error generating DOCX', error);
            alert('Failed to generate Word document');
        } finally {
            setIsGeneratingPdf(null);
        }
    };


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setIsSubmitting(true);

        // Append Bank Instructions to Notes to persist them!
        const bank = bankAccounts.find(b => b.id === selectedBankId);
        const signatory = signatories.find(s => s.id === selectedSignatoryId);

        let finalNotes = notes;
        if (bank) {
            finalNotes += `\n\nPAYMENT DETAILS:\nBank: ${bank.bankName}\nAccount Name: ${bank.accountName}\nAccount Number: ${bank.accountNumber}`;
        }
        if (signatory) {
            finalNotes += `\n\nSigned by: ${signatory.name}${signatory.jobTitle ? ' (' + signatory.jobTitle + ')' : ''}`;
        }

        try {
            const result = await createInvoice({
                clientId,
                matterId: formData.get('matterId') as string || undefined,
                billToName: billToName,
                billToAddress, billToCity, billToState, attentionTo,
                notes: finalNotes,
                dueDate: formData.get('dueDate') ? new Date(formData.get('dueDate') as string) : undefined,
                items: items.map((item, index) => ({
                    description: item.description,
                    amount: Math.round(Number(item.amount) * 100), // Convert to kobo
                    quantity: Number(item.quantity),
                    order: index,
                })),
                vatRate,
                securityChargeRate,
            });

            if (result.success) {
                alert(`Invoice ${invoiceNumber} created!`);
                setItems([{ description: '', amount: 0, quantity: 1 }]);
                // Reset fields
                setBillToName(''); setBillToAddress(''); setBillToCity(''); setBillToState(''); setAttentionTo(''); setNotes('');
                onClose();
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Error creating invoice:', error);
            alert('Failed to create invoice');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ... Calculations and Render ...
    const totals = calculateTotals();

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Header ... */}
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Invoice Management</h2>
                        <p className={styles.subtitle}>{clientName}</p>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn} disabled={isSubmitting}><X size={20} /></button>
                </div>

                {/* Tabs ... */}
                <div className={styles.tabs}>
                    <button className={`${styles.tab} ${activeTab === 'create' ? styles.tabActive : ''}`} onClick={() => setActiveTab('create')} disabled={isSubmitting}>
                        <Plus size={16} />
                        Create Invoice
                    </button>
                    <button className={`${styles.tab} ${activeTab === 'list' ? styles.tabActive : ''}`} onClick={() => setActiveTab('list')} disabled={isSubmitting}>
                        <FileText size={16} />
                        View Invoices
                    </button>
                </div>

                <div className={styles.content}>
                    {activeTab === 'create' && (
                        <form className={styles.createForm} onSubmit={handleSubmit}>
                            {/* Invoice Details Grid */}
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Invoice Number</label>
                                    <input type="text" className={styles.input} value={invoiceNumber} disabled style={{ background: 'var(--background)', cursor: 'not-allowed' }} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Due Date</label>
                                    <input type="date" name="dueDate" className={styles.input} disabled={isSubmitting} />
                                </div>
                            </div>

                            {/* Signatory & Bank Selection */}
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Authorized Signatory</label>
                                    <select
                                        className={styles.input}
                                        value={selectedSignatoryId}
                                        onChange={e => setSelectedSignatoryId(e.target.value)}
                                        disabled={isSubmitting}
                                    >
                                        <option value="">Select Signatory...</option>
                                        {signatories.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} {s.jobTitle ? `(${s.jobTitle})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Payment Account</label>
                                    <select
                                        className={styles.input}
                                        value={selectedBankId}
                                        onChange={e => setSelectedBankId(e.target.value)}
                                        disabled={isSubmitting}
                                    >
                                        <option value="">Select Bank Account...</option>
                                        {bankAccounts.map(b => (
                                            <option key={b.id} value={b.id}>{b.bankName} - {b.currency}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Matter Selection */}
                            {matters.length > 0 && (
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Link to Matter (Optional)</label>
                                    <select
                                        name="matterId"
                                        className={styles.input}
                                        disabled={isSubmitting || isLoadingMatters}
                                    >
                                        <option value="">No matter selected</option>
                                        {matters.map(matter => (
                                            <option key={matter.id} value={matter.id}>
                                                {matter.caseNumber} - {matter.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Bill To */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Bill To (Name/Company) *</label>
                                <input
                                    className={styles.input}
                                    value={billToName}
                                    onChange={e => setBillToName(e.target.value)}
                                    placeholder="The Managing Director, Arete Protea Global Services Ltd"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Address</label>
                                <input
                                    className={styles.input}
                                    value={billToAddress}
                                    onChange={e => setBillToAddress(e.target.value)}
                                    placeholder="47b Royal Palm Drive, Osborne Foreshore Estate"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <input
                                        className={styles.input}
                                        value={billToCity}
                                        onChange={e => setBillToCity(e.target.value)}
                                        placeholder="City"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <input
                                        className={styles.input}
                                        value={billToState}
                                        onChange={e => setBillToState(e.target.value)}
                                        placeholder="State"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Attention To</label>
                                <input
                                    className={styles.input}
                                    value={attentionTo}
                                    onChange={e => setAttentionTo(e.target.value)}
                                    placeholder="Contact Person"
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Items */}
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
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(index)}
                                                    className={styles.removeItemBtn}
                                                    title="Remove item"
                                                    disabled={isSubmitting}
                                                >
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

                            {/* Tax Configuration */}
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>VAT Rate (%)</label>
                                    <input
                                        type="number"
                                        className={styles.input}
                                        value={vatRate}
                                        onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                                        step="0.1"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Security Charge (%)</label>
                                    <input
                                        type="number"
                                        className={styles.input}
                                        value={securityChargeRate}
                                        onChange={(e) => setSecurityChargeRate(parseFloat(e.target.value) || 0)}
                                        step="0.1"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            {/* Totals Box... same as before */}
                            <div className={styles.totalsBox}>
                                <div className={styles.totalRow}><span>Subtotal:</span><span>{formatCurrency(totals.subtotal)}</span></div>
                                <div className={styles.totalRow}><span>VAT ({vatRate}%):</span><span>{formatCurrency(totals.vat)}</span></div>
                                <div className={styles.totalRow}>
                                    <span>Security Charges ({securityChargeRate}%):</span>
                                    <span>{formatCurrency(totals.securityCharge)}</span>
                                </div>
                                <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                                    <span>TOTAL:</span>
                                    <span>{formatCurrency(totals.total)}</span>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Payment Instructions / Notes</label>
                                <textarea
                                    className={styles.textarea}
                                    rows={2}
                                    placeholder="Payment should be made in favour of..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Footer Actions */}
                            <div className={styles.formActions}>
                                <button
                                    type="button"
                                    className={styles.iconBtn}
                                    onClick={() => handleDownloadPDF(null)}
                                    disabled={isGeneratingPdf === 'draft' || isSubmitting}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                                        padding: '0.5rem 0.75rem', fontSize: '0.875rem',
                                        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                                        background: 'var(--surface)', cursor: 'pointer'
                                    }}
                                >
                                    {isGeneratingPdf === 'draft' ? <Loader className="spin" size={16} /> : <Download size={16} />}
                                    Preview PDF
                                </button>
                                <button
                                    type="button"
                                    className={styles.iconBtn}
                                    onClick={() => handleDownloadDOCX(null)}
                                    disabled={isGeneratingPdf === 'draft-docx' || isSubmitting}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                                        padding: '0.5rem 0.75rem', fontSize: '0.875rem',
                                        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                                        background: 'var(--surface)', cursor: 'pointer'
                                    }}
                                >
                                    {isGeneratingPdf === 'draft-docx' ? <Loader className="spin" size={16} /> : <FileText size={16} />}
                                    Word
                                </button>
                                <div style={{ flex: 1 }} />
                                <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader size={18} className="spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <DollarSign size={18} />
                                            Create Invoice
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'list' && (
                        <div className={styles.invoiceList}>
                            {isLoadingInvoices ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    <Loader size={32} className="spin" />
                                    <p>Loading invoices...</p>
                                </div>
                            ) : invoices.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    <p>No invoices found for this client.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {invoices.map(invoice => (
                                        <div key={invoice.id} className={styles.invoiceCard}
                                            style={{
                                                padding: '1rem',
                                                border: '1px solid var(--border)',
                                                borderRadius: 'var(--radius-md)',
                                                background: 'var(--background)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <div>
                                                    <h3 style={{ fontWeight: 600, fontSize: '1.1rem' }}>{invoice.invoiceNumber}</h3>
                                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                        {new Date(invoice.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                                                        {formatCurrencyFromKobo(invoice.totalAmount)}
                                                    </p>
                                                    <p style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        color: invoice.status === 'PAID' ? 'var(--success)' : invoice.status === 'OVERDUE' ? 'var(--error)' : 'var(--warning)',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {invoice.status.replace('_', ' ')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Financial Breakdown */}
                                            <div style={{
                                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
                                                background: 'var(--surface-subtle)', padding: '0.5rem', borderRadius: '4px',
                                                marginBottom: '0.5rem', fontSize: '0.875rem'
                                            }}>
                                                <div>
                                                    <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Paid</span>
                                                    <span style={{ fontWeight: 500, color: 'var(--success)' }}>
                                                        {formatCurrencyFromKobo(invoice.paidAmount || 0)}
                                                    </span>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Outstanding</span>
                                                    <span style={{ fontWeight: 600, color: invoice.totalAmount - (invoice.paidAmount || 0) <= 0 ? 'var(--text-secondary)' : '#DC2626' }}>
                                                        {formatCurrencyFromKobo(invoice.totalAmount - (invoice.paidAmount || 0))}
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                                                <button
                                                    onClick={() => handleDownloadPDF(invoice)}
                                                    className={styles.iconBtn}
                                                    title="Download PDF"
                                                    disabled={isGeneratingPdf === invoice.id}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                                                        padding: '0.5rem 0.75rem', fontSize: '0.875rem',
                                                        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                                                        background: 'var(--surface)', cursor: 'pointer'
                                                    }}
                                                >
                                                    {isGeneratingPdf === invoice.id ? (
                                                        <Loader size={14} className="spin" />
                                                    ) : (
                                                        <Download size={14} />
                                                    )}
                                                    PDF
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadDOCX(invoice)}
                                                    className={styles.iconBtn}
                                                    title="Download Word"
                                                    disabled={isGeneratingPdf === invoice.id + '-docx'}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                                                        padding: '0.5rem 0.75rem', fontSize: '0.875rem',
                                                        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                                                        background: 'var(--surface)', cursor: 'pointer'
                                                    }}
                                                >
                                                    {isGeneratingPdf === invoice.id + '-docx' ? (
                                                        <Loader size={14} className="spin" />
                                                    ) : (
                                                        <FileText size={14} />
                                                    )}
                                                    Word
                                                </button>

                                                {invoice.status !== 'PAID' && onRecordPayment && (
                                                    <button
                                                        onClick={() => onRecordPayment(invoice)}
                                                        className={styles.primaryBtn}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                                                            padding: '0.5rem 0.75rem', fontSize: '0.875rem',
                                                            background: 'var(--primary)', color: 'white', border: 'none',
                                                            borderRadius: 'var(--radius-sm)', cursor: 'pointer'
                                                        }}
                                                    >
                                                        <CreditCard size={14} />
                                                        Pay
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
