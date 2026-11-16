import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';
import { getCurrentUserWithWorkspace } from '@/lib/workspace';

/**
 * "Assembled into a spreadsheet on request" — Ledger's own words. Reads
 * the same Expense rows the rest of the app already uses, so the export
 * always matches what's actually recorded, not a parallel copy.
 */
export async function GET() {
    const data = await getCurrentUserWithWorkspace();
    if (!data?.user || !data.workspace) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expenses = await prisma.expense.findMany({
        where: { workspaceId: data.workspace.id },
        orderBy: { date: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Expenses');
    sheet.columns = [
        { header: 'Date', key: 'date', width: 16 },
        { header: 'Description', key: 'description', width: 40 },
        { header: 'Category', key: 'category', width: 28 },
        { header: 'Amount (NGN)', key: 'amount', width: 16 },
        { header: 'Reference', key: 'reference', width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const e of expenses) {
        sheet.addRow({
            date: e.date.toISOString().slice(0, 10),
            description: e.description ?? '',
            category: e.category,
            amount: Number(e.amount),
            reference: e.reference ?? '',
        });
    }

    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalRow = sheet.addRow({ description: 'Total', amount: total });
    totalRow.font = { bold: true };
    sheet.getColumn('amount').numFmt = '#,##0.00';

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buffer), {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="expenses-${data.workspace.id}.xlsx"`,
        },
    });
}
