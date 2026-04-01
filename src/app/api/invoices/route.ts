import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// GET /api/invoices - List invoices for a client
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get('clientId');

        if (!clientId) {
            return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
        }

        const invoices = await prisma.invoice.findMany({
            where: { clientId },
            include: {
                client: {
                    select: { name: true, email: true },
                },
                matter: {
                    select: { name: true, caseNumber: true },
                },
                items: {
                    orderBy: { order: 'asc' },
                },
                payments: true,
            },
            orderBy: { date: 'desc' },
        });

        return NextResponse.json(invoices);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }
}

// POST /api/invoices - Create a new invoice with line items
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            invoiceNumber,
            clientId,
            matterId,
            dueDate,
            billToName,
            billToAddress,
            billToCity,
            billToState,
            attentionTo,
            notes,
            items, // Array of { description, amount }
            vatRate = 7.5,
            securityChargeRate = 1.0,
        } = body;

        if (!invoiceNumber || !clientId || !billToName || !items || items.length === 0) {
            return NextResponse.json(
                { error: 'invoiceNumber, clientId, billToName, and items are required' },
                { status: 400 }
            );
        }

        // Calculate amounts using Decimal for precision
        const subtotal = items.reduce(
            (sum: Prisma.Decimal, item: any) => sum.plus(new Prisma.Decimal(item.amount)), 
            new Prisma.Decimal(0)
        );
        const vatAmount = subtotal.times(new Prisma.Decimal(vatRate).dividedBy(100));
        const securityChargeAmount = subtotal.times(new Prisma.Decimal(securityChargeRate).dividedBy(100));
        const totalAmount = subtotal.plus(vatAmount).plus(securityChargeAmount);

        // Create invoice with items
        const invoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                clientId,
                matterId,
                dueDate: dueDate ? new Date(dueDate) : null,
                billToName,
                billToAddress,
                billToCity,
                billToState,
                attentionTo,
                notes,
                subtotal,
                vatRate,
                vatAmount,
                securityChargeRate,
                securityChargeAmount,
                totalAmount,
                items: {
                    create: items.map((item: any, index: number) => ({
                        description: item.description,
                        amount: new Prisma.Decimal(item.amount),
                        quantity: item.quantity || 1,
                        order: index,
                    })),
                },
            },
            include: {
                client: {
                    select: { name: true, email: true },
                },
                items: true,
            },
        });

        return NextResponse.json(invoice, { status: 201 });
    } catch (error) {
        console.error('Error creating invoice:', error);
        return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    }
}
