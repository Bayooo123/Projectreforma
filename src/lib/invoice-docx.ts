
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, ImageRun, Header, Footer } from 'docx';

export interface InvoiceData {
    invoiceNumber: string;
    date: Date;
    dueDate?: Date;
    billTo: {
        name: string;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        attentionTo?: string | null;
    };
    items: {
        description: string;
        amount: number; // in kobo/cents
        quantity: number;
    }[];
    totals: {
        subtotal: number;
        vat: number;
        securityCharge: number;
        total: number;
    };
    bankDetails?: {
        bankName: string;
        accountNumber: string;
        accountName: string;
        currency: string;
    };
    signatory?: {
        name: string;
        jobTitle?: string;
    };
    letterheadUrl?: string | null;
}

export async function generateInvoiceDOCX(data: InvoiceData): Promise<Blob> {
    // 1. Fetch Letterhead Image if exists
    let letterheadImage: ArrayBuffer | null = null;
    if (data.letterheadUrl) {
        try {
            const response = await fetch(data.letterheadUrl);
            letterheadImage = await response.arrayBuffer();
        } catch (e) {
            console.error('Failed to load letterhead', e);
        }
    }

    const formatCurrency = (amount: number) => {
        return `₦${(amount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // 2. Build Document
    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 1000,
                        right: 1000,
                        bottom: 1000,
                        left: 1000,
                    },
                },
            },
            headers: {
                default: new Header({
                    children: letterheadImage ? [
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: letterheadImage,
                                    transformation: {
                                        width: 600,
                                        height: 100,
                                    },
                                    type: "png", // Assumption: generic type to satisfy strict typing
                                }),
                            ],
                            alignment: AlignmentType.CENTER,
                        }),
                    ] : [],
                }),
            },
            children: [
                new Paragraph({ children: [], spacing: { before: 200 } }),

                // Date
                new Paragraph({
                    children: [new TextRun({ text: formatDate(data.date), bold: true, size: 24 })], // 12pt
                    spacing: { after: 200 },
                }),

                // INVOICE Title
                new Paragraph({
                    children: [new TextRun({ text: "INVOICE", bold: true, size: 28 })], // 14pt
                    spacing: { after: 200 },
                }),

                // Invoice Number (Subtle)
                new Paragraph({
                    children: [new TextRun({ text: `Ref: ${data.invoiceNumber}`, size: 20 })],
                    spacing: { after: 200 },
                }),

                // Bill To Box using Table
                new Table({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: "Bill To:", bold: true })], spacing: { after: 100 } }),
                                        new Paragraph({ children: [new TextRun({ text: data.billTo.name, bold: true })] }),
                                        ...(data.billTo.address ? [new Paragraph({ children: [new TextRun(data.billTo.address)] })] : []),
                                        ...(data.billTo.city || data.billTo.state ? [new Paragraph({ children: [new TextRun(`${data.billTo.city || ''} ${data.billTo.state || ''}`)] })] : []),
                                    ],
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                }),
                            ],
                        }),
                    ],
                }),

                // Attention To
                ...(data.billTo.attentionTo ? [
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Attention: ", bold: true }),
                            new TextRun({ text: data.billTo.attentionTo, bold: true })
                        ],
                        spacing: { before: 200, after: 400 },
                    })
                ] : [new Paragraph({ children: [], spacing: { before: 400 } })]),

                // Main Table
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1 },
                        bottom: { style: BorderStyle.SINGLE, size: 1 },
                        left: { style: BorderStyle.SINGLE, size: 1 },
                        right: { style: BorderStyle.SINGLE, size: 1 },
                        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                        insideVertical: { style: BorderStyle.SINGLE, size: 1 },
                    },
                    rows: [
                        // Header
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "S/N", bold: true })] })], width: { size: 10, type: WidthType.PERCENTAGE } }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DESCRIPTION", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 60, type: WidthType.PERCENTAGE } }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "AMOUNT", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 30, type: WidthType.PERCENTAGE } }),
                            ],
                            tableHeader: true,
                        }),
                        // Item Rows
                        ...data.items.map((item, index) => new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({ text: (index + 1).toString(), alignment: AlignmentType.CENTER })],
                                    verticalAlign: AlignmentType.CENTER,
                                }),
                                new TableCell({
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: item.description, bold: true })] }),
                                    ],
                                    verticalAlign: AlignmentType.CENTER,
                                }),
                                new TableCell({
                                    children: [new Paragraph({ text: formatCurrency(item.amount), alignment: AlignmentType.RIGHT })],
                                    verticalAlign: AlignmentType.CENTER,
                                }),
                            ],
                        })),
                        // VAT Row
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: (data.items.length + 1).toString(), alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "VAT (7.5%)", bold: true })] })] }),
                                new TableCell({ children: [new Paragraph({ text: formatCurrency(data.totals.vat), alignment: AlignmentType.RIGHT })] }),
                            ],
                        }),
                        // Security Charge Row
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: (data.items.length + 2).toString(), alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "SECURITY CHARGES (1%)", bold: true })] })] }),
                                new TableCell({ children: [new Paragraph({ text: formatCurrency(data.totals.securityCharge), alignment: AlignmentType.RIGHT })] }),
                            ],
                        }),
                        // Total Row
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph("")] }), // Empty S/N
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TOTAL", bold: true })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(data.totals.total), bold: true })], alignment: AlignmentType.RIGHT })] }),
                            ],
                        }),
                    ],
                }),

                new Paragraph({ children: [], spacing: { before: 600 } }),

                // Payment Info
                ...(data.bankDetails ? [
                    new Paragraph({ children: [new TextRun({ text: "Payment should be made in favour of:", bold: true })], spacing: { after: 100 } }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE } },
                        rows: [
                            new TableRow({ children: [new TableCell({ children: [new Paragraph("Account Name:")] }), new TableCell({ children: [new Paragraph(data.bankDetails.accountName)] })] }),
                            new TableRow({ children: [new TableCell({ children: [new Paragraph("Account Number:")] }), new TableCell({ children: [new Paragraph(data.bankDetails.accountNumber)] })] }),
                            new TableRow({ children: [new TableCell({ children: [new Paragraph("Bank:")] }), new TableCell({ children: [new Paragraph(data.bankDetails.bankName)] })] }),
                        ]
                    }),
                ] : []),

                new Paragraph({ children: [], spacing: { before: 600 } }),

                // Signatory
                ...(data.signatory ? [
                    new Paragraph({ text: "__________________________" }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: data.signatory.name, bold: true }),
                            ...(data.signatory.jobTitle ? [new TextRun({ text: ` ${data.signatory.jobTitle}`, bold: true })] : [])
                        ]
                    }),
                ] : []),
            ],
        }],
    });

    return await Packer.toBlob(doc);
}
