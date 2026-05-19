import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookHash, verifyTransaction } from '@/lib/monnify';

export async function POST(req: NextRequest) {
    const payload = await req.json();

    if (!verifyWebhookHash(payload)) {
        console.error('[Monnify webhook] Invalid hash — rejected');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    if (payload.paymentStatus !== 'PAID') {
        return NextResponse.json({ ok: true });
    }

    const payment = await prisma.subscriptionPayment.findUnique({
        where: { paymentReference: payload.paymentReference },
    });

    if (!payment) {
        console.error('[Monnify webhook] Unknown reference:', payload.paymentReference);
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status === 'paid') {
        return NextResponse.json({ ok: true });
    }

    // Verify server-side with Monnify before activating
    const verification = await verifyTransaction(payload.transactionReference);
    if (verification.paymentStatus !== 'PAID') {
        console.error('[Monnify webhook] Verification failed for:', payload.transactionReference);
        return NextResponse.json({ error: 'Payment not verified' }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await prisma.$transaction([
        prisma.subscriptionPayment.update({
            where: { paymentReference: payload.paymentReference },
            data: { status: 'paid', paidAt: now },
        }),
        prisma.workspace.update({
            where: { id: payment.workspaceId },
            data: {
                plan: 'active',
                subscriptionStatus: 'active',
                subscriptionBand: payment.band,
                subscriptionTier: payment.tier,
                subscriptionStartedAt: now,
                subscriptionExpiresAt: expiresAt,
            },
        }),
    ]);

    console.log(`[Monnify webhook] Workspace ${payment.workspaceId} activated — Band ${payment.band} ${payment.tier} until ${expiresAt.toISOString()}`);
    return NextResponse.json({ ok: true });
}
