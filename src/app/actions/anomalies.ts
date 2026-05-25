'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

async function getSession() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorised');
    return session;
}

export async function getOpenAnomalies(workspaceId: string) {
    const session = await getSession();
    if (session.user.workspaceId !== workspaceId) return [];

    return prisma.workspaceAnomaly.findMany({
        where: { workspaceId, status: { in: ['open', 'acknowledged'] } },
        orderBy: { detectedAt: 'desc' },
        take: 50,
    });
}

export async function acknowledgeAnomaly(anomalyId: string) {
    const session = await getSession();
    const anomaly = await prisma.workspaceAnomaly.findUnique({ where: { id: anomalyId }, select: { workspaceId: true } });
    if (!anomaly || anomaly.workspaceId !== session.user.workspaceId) return { success: false };

    await prisma.workspaceAnomaly.update({
        where: { id: anomalyId },
        data: { status: 'acknowledged' },
    });
    revalidatePath('/pulse');
    return { success: true };
}

export async function resolveAnomaly(anomalyId: string) {
    const session = await getSession();
    const anomaly = await prisma.workspaceAnomaly.findUnique({ where: { id: anomalyId }, select: { workspaceId: true } });
    if (!anomaly || anomaly.workspaceId !== session.user.workspaceId) return { success: false };

    await prisma.workspaceAnomaly.update({
        where: { id: anomalyId },
        data: { status: 'resolved', resolvedAt: new Date(), resolvedById: session.user.id },
    });
    revalidatePath('/pulse');
    return { success: true };
}

export async function dismissAnomaly(anomalyId: string) {
    const session = await getSession();
    const anomaly = await prisma.workspaceAnomaly.findUnique({ where: { id: anomalyId }, select: { workspaceId: true } });
    if (!anomaly || anomaly.workspaceId !== session.user.workspaceId) return { success: false };

    await prisma.workspaceAnomaly.update({
        where: { id: anomalyId },
        data: { status: 'dismissed', resolvedAt: new Date(), resolvedById: session.user.id },
    });
    revalidatePath('/pulse');
    return { success: true };
}
