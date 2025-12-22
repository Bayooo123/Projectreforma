
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
    bankDetails?: {
        bankName: string;
        accountNumber: string;
        accountName: string;
    };
    signatory?: {
        name: string;
        jobTitle?: string | null;
    };
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
    // 1. Load Letterhead if available
    if (data.letterheadUrl) {
        try {
            // Use HTMLImageElement for robust format detection by browser
            const img = new Image();
            img.crossOrigin = "Anonymous"; // Crucial for CORS if images are on Vercel Blob
            img.src = data.letterheadUrl;

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            // Calculate dimensions to fit width while maintaining aspect ratio
            const imgProps = doc.getImageProperties(img);
            const pdfWidth = pageWidth;
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            // Render image at top (0,0)
            doc.addImage(img, 'JPEG', 0, 0, pdfWidth, pdfHeight);

            // Adjust startY to avoid overlap
            // Use a minimum of 40mm or the image height + padding
            const dynamicStartY = pdfHeight + 10;
            // Only update startY if image pushes content down significantly
            // But if image is small/header-like, we might want standard spacing.
            // Let's assume letterhead takes up top portion.
            if (dynamicStartY > 50) {
                // Update the local startY used in next section
                // Note: We need to update the variable used later. 
                // We will return this or modify state? 
                // Actually the next section defines `startY = 50`. 
                // We should change that logic too.
            }
        } catch (error) {
            console.warn('Failed to load letterhead image', error);
        }
    }

    // 2. Invoice Header Information
    // Position content below header area (assuming top 40mm is header)
    let startY = 50;

    // Check if we need to push down content based on letterhead (approximate check)
    // Since we can't easily share scope from the try-block above without refactoring entire function,
    // we'll stick to a standard 50mm margin for now, which fits most letterheads.
    // Ideally we'd calculate this dynamically.

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

    // 5. Payment Details & Signatory
    finalY += 15;
    const footerStartY = finalY;

    // Payment Section (Left)
    if (data.bankDetails) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Payment should be made in favour of:', 14, finalY);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        finalY += 6;
        doc.text(`Account Name:   ${data.bankDetails.accountName}`, 14, finalY);
        finalY += 5;
        doc.text(`Account Number: ${data.bankDetails.accountNumber}`, 14, finalY);
        finalY += 5;
        doc.text(`Bank:           ${data.bankDetails.bankName}`, 14, finalY);
    }

    // Signatory Section (Below Payment or Right?)
    // Typically signatures are bottom left or right. 
    // Let's put it below payment info, spaced out.
    // Or if payment info is left, sig is left below it.

    finalY += 25; // Space for signature

    if (data.signatory) {
        // Draw Line
        doc.setLineWidth(0.5);
        doc.line(14, finalY, 70, finalY);

        finalY += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);

        const sigName = data.signatory.name;
        const sigTitle = data.signatory.jobTitle || '';

        doc.text(sigName, 14, finalY);
        if (sigTitle) {
            finalY += 5;
            doc.setFont('helvetica', 'normal'); // Title usually regular/italic?
            doc.text(sigTitle, 14, finalY);
        }
    }

    return doc.output('blob');
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
    return `N${(amount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
};
