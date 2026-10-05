import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { assertWorkspaceMember } from '@/lib/workspace-guard';
import { InvoiceService } from '@/lib/services/invoices/invoice-service';

// Resolves the client's workspace and checks the caller belongs to it, so a
// clientId from the request body can't reach another firm's ledger.
async function assertClientAccess(clientId: string): Promise<NextResponse | null> {
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { workspaceId: true } });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    try {
        await assertWorkspaceMember(client.workspaceId);
        return null;
    } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
}

// GET /api/payments - List payments for a client
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');

        if (!clientId) {
            return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
        }
        const denied = await assertClientAccess(clientId);
        if (denied) return denied;

        const payments = await prisma.payment.findMany({
            where: { clientId },
            include: {
                client: {
                    select: { name: true, email: true },
                },
                invoice: {
                    select: { invoiceNumber: true, totalAmount: true },
                },
            },
            orderBy: { date: 'desc' },
        });

        return NextResponse.json(payments);
    } catch (error) {
        console.error('Error fetching payments:', error);
        return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
    }
}

// POST /api/payments - Record a new payment
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { clientId, invoiceId, amount, method, reference } = body;

        if (!clientId || !amount || !method) {
            return NextResponse.json(
                { error: 'clientId, amount, and method are required' },
                { status: 400 }
            );
        }

        const denied = await assertClientAccess(clientId);
        if (denied) return denied;

        if (invoiceId) {
            const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { clientId: true } });
            if (!invoice || invoice.clientId !== clientId) {
                return NextResponse.json({ error: 'Invoice not found for this client' }, { status: 400 });
            }
        }

        const payment = await prisma.$transaction(async (tx) => {
            const payment = await tx.payment.create({
                data: {
                    clientId,
                    invoiceId,
                    amount: new Prisma.Decimal(amount),
                    method,
                    reference,
                },
                include: {
                    client: {
                        select: { name: true, email: true },
                    },
                },
            });
            if (invoiceId) await InvoiceService.syncStatusFromPayments(invoiceId, tx);
            return payment;
        });

        return NextResponse.json(payment, { status: 201 });
    } catch (error) {
        console.error('Error recording payment:', error);
        return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
    }
}
