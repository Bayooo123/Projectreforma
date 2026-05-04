import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const SEV_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export async function GET() {
    const session = await auth();
    if (!session?.user?.workspaceId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const anomalies = await prisma.workspaceAnomaly.findMany({
        where: { workspaceId: session.user.workspaceId, status: { in: ['open', 'acknowledged'] } },
        orderBy: { detectedAt: 'desc' },
        take: 30,
    });

    const sorted = [...anomalies].sort(
        (a, b) => (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9)
    );

    return NextResponse.json({ anomalies: sorted });
}
