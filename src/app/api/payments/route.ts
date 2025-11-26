import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/payments - List payments for a client
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');

        if (!clientId) {
            return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
        }

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

        const payment = await prisma.payment.create({
            data: {
                clientId,
                invoiceId,
                amount: parseInt(amount),
                method,
                reference,
            },
            include: {
                client: {
                    select: { name: true, email: true },
                },
            },
        });

        // If payment is linked to an invoice, update invoice status
        if (invoiceId) {
            const invoice = await prisma.invoice.findUnique({
                where: { id: invoiceId },
                include: { payments: true },
            });

            if (invoice) {
                const totalPaid = invoice.payments.reduce(
                    (sum: number, p: { amount: number }) => sum + p.amount,
                    0
                );
                const newStatus = totalPaid >= invoice.totalAmount ? 'paid' : 'pending';

                await prisma.invoice.update({
                    where: { id: invoiceId },
                    data: { status: newStatus },
                });
            }
        }

        return NextResponse.json(payment, { status: 201 });
    } catch (error) {
        console.error('Error recording payment:', error);
        return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
    }
}
