import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth, successResponse, errorResponse } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/matters
 * List matters in the workspace
 */
export async function GET(request: NextRequest) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const lawyerId = searchParams.get('lawyerId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
        const where: any = {
            workspaceId: auth!.workspaceId,
        };

        if (status) where.status = status;
        if (clientId) where.clientId = clientId;
        if (lawyerId) where.assignedLawyerId = lawyerId;

        const [matters, total] = await Promise.all([
            prisma.matter.findMany({
                where,
                include: {
                    client: { select: { id: true, name: true } },
                    assignedLawyer: { select: { id: true, name: true } },
                },
                orderBy: { nextCourtDate: 'asc' },
                take: limit,
                skip: offset,
            }),
            prisma.matter.count({ where }),
        ]);

        const data = matters.map(matter => ({
            id: matter.id,
            caseNumber: matter.caseNumber,
            name: matter.name,
            status: matter.status,
            court: matter.court,
            judge: matter.judge,
            nextCourtDate: matter.nextCourtDate,
            client: matter.client,
            assignedLawyer: matter.assignedLawyer,
            createdAt: matter.createdAt,
        }));

        return successResponse(data, { total, limit, offset });

    } catch (err) {
        console.error('Error fetching matters:', err);
        return errorResponse('SERVER_ERROR', 'Failed to fetch matters', 500);
    }
}

/**
 * POST /api/v1/matters
 * Create a new matter
 */
export async function POST(request: NextRequest) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const body = await request.json();
        const { caseNumber, name, clientId, assignedLawyerId, court, judge, description, nextCourtDate } = body;

        if (!caseNumber) {
            return errorResponse('VALIDATION_ERROR', 'Case number is required', 400, 'caseNumber');
        }
        if (!name) {
            return errorResponse('VALIDATION_ERROR', 'Matter name is required', 400, 'name');
        }
        if (!clientId) {
            return errorResponse('VALIDATION_ERROR', 'Client ID is required', 400, 'clientId');
        }

        // Verify client belongs to workspace
        const client = await prisma.client.findFirst({
            where: { id: clientId, workspaceId: auth!.workspaceId },
        });

        if (!client) {
            return errorResponse('NOT_FOUND', 'Client not found in this workspace', 404, 'clientId');
        }

        const matter = await prisma.matter.create({
            data: {
                caseNumber,
                name,
                clientId,
                assignedLawyerId: assignedLawyerId || auth!.userId,
                court,
                judge,
                description,
                nextCourtDate: nextCourtDate ? new Date(nextCourtDate) : null,
                status: 'active',
                workspaceId: auth!.workspaceId,
            },
            include: {
                client: { select: { id: true, name: true } },
                assignedLawyer: { select: { id: true, name: true } },
            },
        });

        // Log activity
        await prisma.matterActivityLog.create({
            data: {
                matterId: matter.id,
                action: 'Matter created via API',
                performedById: auth!.userId,
            },
        });

        return successResponse(matter);

    } catch (err: any) {
        console.error('Error creating matter:', err);
        if (err.code === 'P2002') {
            return errorResponse('VALIDATION_ERROR', 'Case number already exists', 400, 'caseNumber');
        }
        return errorResponse('SERVER_ERROR', 'Failed to create matter', 500);
    }
}
