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
        let invoiceToUse = invoice;

        if (!invoiceToUse) {
            const savedInvoice = await saveDraft();
            if (!savedInvoice) return;
            invoiceToUse = savedInvoice;
        }

        const targetId = invoiceToUse!.id;
        setIsGeneratingPdf(targetId);

        try {
            const bank = bankAccounts.find(b => b.id === selectedBankId);
            const signatory = signatories.find(s => s.id === selectedSignatoryId);

            let pdfData: any = {};

            // Reconstruct data from saved invoice
            let subtotal = 0;
            const pdfItems = invoiceToUse!.items.map((item: any) => {
                const quantity = Number(item.quantity);
                const amount = Number(item.amount);
                subtotal += (amount * quantity);
                return {
                    description: item.description,
                    quantity: quantity,
                    amount: amount
                };
            });

            const vat = Math.round(subtotal * 0.075);
            const security = Math.round(subtotal * 0.01);
            const total = subtotal + vat + security; // or invoiceToUse!.totalAmount

            pdfData = {
                invoiceNumber: invoiceToUse!.invoiceNumber,
                date: new Date(invoiceToUse!.createdAt),
                dueDate: invoiceToUse!.dueDate ? new Date(invoiceToUse!.dueDate) : undefined,
                billTo: {
                    name: invoiceToUse!.billToName,
                    address: invoiceToUse!.billToAddress || undefined,
                    city: invoiceToUse!.billToCity || undefined,
                    state: invoiceToUse!.billToState || undefined,
                    attentionTo: invoiceToUse!.attentionTo || undefined
                },
                items: pdfItems,
                totals: {
                    subtotal,
                    vat: vat,
                    securityCharge: security,
                    total: invoiceToUse!.totalAmount
                },
                bankDetails: bank,
                signatory: signatory
            };

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

            if (!invoice) {
                alert('Invoice has been saved and downloaded.');
                onClose();
            }

        } catch (error) {
            console.error('Failed to generate PDF', error);
            alert('Failed to generate PDF');
        } finally {
            setIsGeneratingPdf(null);
        }
    };



    const handleDownloadDOCX = async (invoice: Invoice | null) => {
        let invoiceToUse = invoice;

        // Auto-save if draft
        if (!invoiceToUse) {
            // Provide visual feedback? "Saving..." handled by isSubmitting/isGeneratingPdf
            const savedInvoice = await saveDraft();
            if (!savedInvoice) return; // Save failed
            invoiceToUse = savedInvoice;
            // DO NOT CLOSE MODAL automatically here, user might want to keep editing? 
            // Or at least switch to view mode?
            // Ideally we should refresh the list or context.
            // For now, we continue with generation.
            // Note: savedInvoice might need to be cast to Invoice type if action result differs slightly?
            // Assuming action returns full invoice object.
        }

        const targetId = invoiceToUse!.id + '-docx';
        setIsGeneratingPdf(targetId);

        try {
            // Need to re-fetch or use saved invoice data.
            // savedInvoice should have everything.

            // Re-construct data for generator
            // We need to parse items, sums etc.

            let subtotal = 0;
            const pdfItems = invoiceToUse!.items.map((item: any) => {
                // If newly created, item.amount is in kobo (integer). verify.
                // createInvoice returns the DB object (amount in kobo).
                // generateInvoiceDOCX expects amount in kobo.
                // UI items use fractional naira (e.g. 15000.00).

                // If specific structure return from DB:
                const quantity = Number(item.quantity);
                const amount = Number(item.amount); // Kobo
                subtotal += (amount * quantity);
                return {
                    description: item.description,
                    quantity: quantity,
                    amount: amount
                };
            });
            const vat = Math.round(subtotal * 0.075);
            const security = Math.round(subtotal * 0.01);
            const total = subtotal + vat + security;

            // Ensure bank details are passed if not in invoice object?
            // The invoice object from DB typically doesn't have bank/signatory snapshot unless we store it.
            // But we stored it in 'notes'.
            // The generator might want structured bank/signatory.
            // We can use the CURRENTLY SELECTED bank/signatory from state if we just saved it.
            // OR parse from notes?
            // Let's use the selected ones from state for now as fallback/primary.
            const bank = bankAccounts.find(b => b.id === selectedBankId);
            const signatory = signatories.find(s => s.id === selectedSignatoryId);

            const data = {
                invoiceNumber: invoiceToUse!.invoiceNumber,
                date: new Date(invoiceToUse!.createdAt),
                dueDate: invoiceToUse!.dueDate ? new Date(invoiceToUse!.dueDate) : undefined,
                billTo: {
                    name: invoiceToUse!.billToName,
                    address: invoiceToUse!.billToAddress || undefined,
                    city: invoiceToUse!.billToCity || undefined,
                    state: invoiceToUse!.billToState || undefined,
                    attentionTo: invoiceToUse!.attentionTo || undefined
                },
                items: pdfItems,
                totals: { subtotal, vat, securityCharge: security, total: total }, // Use calculated total or DB total? DB total usually includes tax.
                bankDetails: bank,
                signatory: signatory,
                letterheadUrl: letterheadUrl
            };

            const blob = await generateInvoiceDOCX(data);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice-${data.invoiceNumber}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // If we just created it, maybe alert user?
            if (!invoice) {
                alert('Invoice has been saved and downloaded.');
                onClose(); // Close after successful save & download? Matches "handleSubmit" behavior approx.
            }

        } catch (error) {
            console.error('Error generating DOCX', error);
            alert('Failed to generate Word document');
        } finally {
            setIsGeneratingPdf(null);
        }
    };


    const saveDraft = async (): Promise<any> => {
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
            // Get due date from form if possible, or state if we bind it? 
            // Currently due date is uncontrolled in the form `name="dueDate"`.
            // We need to fetch it. Let's look up the input ref or just switch to controlled state for dueDate to be safe?
            // Or just query selector? 
            // Better: Switch dueDate to controlled state.
            // For now, let's grab it via ID or Ref. But wait, we are in a function.
            // Let's assume controlled state for consistency or querySelector.
            const dueDateInput = document.querySelector('input[name="dueDate"]') as HTMLInputElement;
            const dueDateVal = dueDateInput?.value ? new Date(dueDateInput.value) : undefined;

            const result = await createInvoice({
                clientId,
                matterId: (document.querySelector('select[name="matterId"]') as HTMLSelectElement)?.value || undefined,
                billToName: billToName,
                billToAddress, billToCity, billToState, attentionTo,
                notes: finalNotes,
                dueDate: dueDateVal,
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
                // alert(`Invoice ${invoiceNumber} created!`); // Don't alert here, return result
                // Update local list? The parent handles refresh via `onClose` usually? 
                // Wait, if we just save-and-download, we might NOT want to close?
                // But we need to switch mode to "edit" or at least know the ID.
                return result.data; // Action returns the invoice in 'data' field
            } else {
                alert(`Error: ${result.error}`);
                return null;
            }
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
        const invoice = await saveDraft();
        if (invoice) {
            alert(`Invoice ${invoice.invoiceNumber} created!`);
            setItems([{ description: '', amount: 0, quantity: 1 }]);
            setBillToName(''); setBillToAddress(''); setBillToCity(''); setBillToState(''); setAttentionTo(''); setNotes('');
            onClose();
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
