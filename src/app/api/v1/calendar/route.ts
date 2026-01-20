import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth, successResponse, errorResponse } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/calendar
 * Get calendar events (court dates) for a date range
 */
export async function GET(request: NextRequest) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const lawyerId = searchParams.get('lawyerId');

    try {
        const where: any = {
            workspaceId: auth!.workspaceId,
            nextCourtDate: { not: null },
        };

        if (start) {
            where.nextCourtDate = { ...where.nextCourtDate, gte: new Date(start) };
        }
        if (end) {
            where.nextCourtDate = { ...where.nextCourtDate, lte: new Date(end) };
        }
        if (lawyerId) {
            where.lawyers = { some: { lawyerId } };
        }

        const matters = await prisma.matter.findMany({
            where,
            include: {
                client: { select: { id: true, name: true } },
                lawyers: {
                    include: {
                        lawyer: { select: { id: true, name: true } }
                    }
                },
            },
            orderBy: { nextCourtDate: 'asc' },
        });

        const data = matters.map(matter => ({
            id: matter.id,
            type: 'court_date',
            matterId: matter.id,
            caseNumber: matter.caseNumber,
            caseName: matter.name,
            date: matter.nextCourtDate?.toISOString().split('T')[0],
            time: matter.nextCourtDate?.toISOString().split('T')[1]?.substring(0, 5),
            court: matter.court,
            judge: matter.judge,
            client: matter.client,
            lawyers: matter.lawyers,
        }));

        return successResponse(data);

    } catch (err) {
        console.error('Error fetching calendar:', err);
        return errorResponse('SERVER_ERROR', 'Failed to fetch calendar', 500);
    }
}
