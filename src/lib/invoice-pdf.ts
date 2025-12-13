
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceItem {
    description: string;
    amount: number; // in kobo or currency unit (we'll assume kobo and divide by 100)
    quantity: number;
}

interface GeneratePDFParams {
    invoiceNumber: string;
    date: Date;
    dueDate?: Date;
    billTo: {
        name: string;
        address?: string;
        city?: string;
        state?: string;
        attentionTo?: string;
    };
    items: InvoiceItem[];
    totals: {
        subtotal: number;
        vat: number;
        securityCharge: number;
        total: number;
    };
    letterheadUrl?: string | null;
}

declare module 'jspdf' {
    interface jsPDF {
        lastAutoTable: { finalY: number };
    }
}

export const generateInvoicePDF = async (data: GeneratePDFParams): Promise<Blob> => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // 1. Load Letterhead if available
    if (data.letterheadUrl) {
        try {
            const imgData = await fetchImage(data.letterheadUrl);
            // Assume full page letterhead for simplicity, or we can adjust
            // If it's a PDF letterhead, we can't easily overlay unless we use pdf-lib.
            // Since we allowed Image or PDF in upload, if it's PDF we might have an issue with jsPDF.
            // For now, let's assume it's an image (JPG/PNG). If it's PDF, we can't render it as background easily in jsPDF without more complex handling.
            // We will try to add it. If it fails (e.g. invalid format), we proceed without it.

            const ext = data.letterheadUrl.split('.').pop()?.toLowerCase();
            if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') {
                doc.addImage(imgData, ext.toUpperCase(), 0, 0, pageWidth, pageHeight);
            }
        } catch (error) {
            console.warn('Failed to load letterhead image', error);
        }
    }

    // 2. Invoice Header Information
    // Position content below header area (assuming top 40mm is header)
    let startY = 50;

    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);

    // Bill To
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 14, startY);
    doc.setFont('helvetica', 'normal');
    let billYoY = startY + 5;
    doc.text(data.billTo.name, 14, billYoY);
    if (data.billTo.address) doc.text(data.billTo.address, 14, billYoY += 5);
    if (data.billTo.city || data.billTo.state) {
        doc.text(`${data.billTo.city || ''} ${data.billTo.state || ''}`.trim(), 14, billYoY += 5);
    }
    if (data.billTo.attentionTo) {
        doc.setFont('helvetica', 'bold');
        doc.text(`Attn: ${data.billTo.attentionTo}`, 14, billYoY += 6);
    }

    // Invoice Details (Right Aligned)
    const rightColX = pageWidth - 60;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('INVOICE', rightColX, startY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice No: ${data.invoiceNumber}`, rightColX, startY + 8);
    doc.text(`Date: ${formatDate(data.date)}`, rightColX, startY + 13);
    if (data.dueDate) {
        doc.text(`Due Date: ${formatDate(data.dueDate)}`, rightColX, startY + 18);
    }

    startY = Math.max(billYoY, startY + 25) + 15;

    // 3. Invoice Items Table
    const tableHeaders = [['Description', 'Qty', 'Amount']];
    const tableData = data.items.map(item => [
        item.description,
        item.quantity,
        formatCurrency(item.amount)
    ]);

    autoTable(doc, {
        startY: startY,
        head: tableHeaders,
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: {
            0: { cellWidth: 'auto' }, // Description
            1: { cellWidth: 20, halign: 'center' }, // Qty
            2: { cellWidth: 40, halign: 'right' }, // Amount
        },
    });

    // 4. Totals
    let finalY = doc.lastAutoTable.finalY + 10;
    const totalsX = pageWidth - 70;

    doc.setFontSize(10);

    // Subtotal
    doc.text('Subtotal:', totalsX, finalY);
    doc.text(formatCurrency(data.totals.subtotal), pageWidth - 14, finalY, { align: 'right' });

    // VAT
    if (data.totals.vat > 0) {
        finalY += 6;
        doc.text('VAT:', totalsX, finalY);
        doc.text(formatCurrency(data.totals.vat), pageWidth - 14, finalY, { align: 'right' });
    }

    // Security Charge
    if (data.totals.securityCharge > 0) {
        finalY += 6;
        doc.text('Security / Admin Charge:', totalsX, finalY);
        doc.text(formatCurrency(data.totals.securityCharge), pageWidth - 14, finalY, { align: 'right' });
    }

    // Total
    finalY += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', totalsX, finalY);
    doc.text(formatCurrency(data.totals.total), pageWidth - 14, finalY, { align: 'right' });

    return doc.output('blob');
};

const fetchImage = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const formatCurrency = (amount: number) => {
    // Input is assumed to be in kobo if passing from backend, but check context.
    // In our app we usually store in kobo. BUT InvoiceModal passes amounts from UI state which might be Naira?
    // Let's assume input to this function is in KOBO.
    // Wait, InvoiceModal items.amount are in Naira from the UI inputs?
    // Let's check usage.
    // If the input amount is 1000 (Naira) from UI, we might need to be careful.
    // The utility expects amount in Kobo usually for formatting, OR we standardize on Naira.
    // Let's standardize this utility to accept KOBO and devide by 100.
    return `N${(amount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
};
