'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { nanoid } from 'nanoid';
import { initializeTransaction } from '@/lib/monnify';
import { getPrice, type SubscriptionBand, type SubscriptionTier, BAND_LABELS, TIER_LABELS } from '@/lib/subscriptionPricing';
import { config } from '@/lib/config';

export async function getSubscriptionStatus(workspaceId: string) {
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
            plan: true,
            subscriptionStatus: true,
            subscriptionBand: true,
            subscriptionTier: true,
            subscriptionExpiresAt: true,
            subscriptionStartedAt: true,
        },
    });
    return workspace;
}

export async function getSubscriptionPayments(workspaceId: string) {
    return prisma.subscriptionPayment.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 10,
    });
}

export async function initiateSubscriptionPayment(data: {
    workspaceId: string;
    band: SubscriptionBand;
    tier: SubscriptionTier;
}) {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'Unauthorized' };

    const workspace = await prisma.workspace.findUnique({
        where: { id: data.workspaceId },
        include: { owner: { select: { name: true, email: true } } },
    });
    if (!workspace) return { success: false, error: 'Workspace not found' };

    const amount = getPrice(data.band, data.tier);
    const paymentReference = `REFORMA-${nanoid(12).toUpperCase()}`;
    const redirectUrl = `${config.NEXT_PUBLIC_APP_URL}/settings?tab=subscription&ref=${paymentReference}`;
    const description = `Reforma Annual Subscription — ${BAND_LABELS[data.band]} · ${TIER_LABELS[data.tier]}`;

    await prisma.subscriptionPayment.create({
        data: {
            workspaceId: data.workspaceId,
            amount,
            band: data.band,
            tier: data.tier,
            paymentReference,
            monnifyReference: '',
            status: 'pending',
        },
    });

    try {
        const result = await initializeTransaction({
            amount,
            customerName: workspace.owner.name || workspace.name,
            customerEmail: workspace.owner.email,
            paymentReference,
            description,
            redirectUrl,
        });

        await prisma.subscriptionPayment.update({
            where: { paymentReference },
            data: { monnifyReference: result.transactionReference },
        });

        return { success: true, checkoutUrl: result.checkoutUrl, paymentReference };
    } catch (err) {
        await prisma.subscriptionPayment.delete({ where: { paymentReference } });
        const message = err instanceof Error ? err.message : 'Payment initiation failed';
        return { success: false, error: message };
    }
}

export async function checkPaymentStatus(paymentReference: string) {
    const payment = await prisma.subscriptionPayment.findUnique({
        where: { paymentReference },
        select: { status: true, paidAt: true, band: true, tier: true },
    });
    return payment;
}
