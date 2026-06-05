import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth, successResponse, errorResponse } from '@/lib/api-auth';
import { MatterService } from '@/lib/services/matters/matter-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/matters
 * List matters in the workspace
 */
export async function GET(request: NextRequest) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? undefined;
    const clientId = searchParams.get('clientId') ?? undefined;
    const lawyerId = searchParams.get('lawyerId') ?? undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
        const { matters, total } = await MatterService.list(auth!.workspaceId, {
            status,
            clientId,
            lawyerId,
            limit,
            offset,
        });

        const data = matters.map(matter => ({
            id: matter.id,
            caseNumber: matter.caseNumber,
            name: matter.name,
            status: matter.status,
            court: matter.court,
            judge: matter.judge,
            nextCourtDate: matter.nextCourtDate,
            client: matter.client,
            lawyers: matter.lawyers,
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
 * Create a new matter (always initializes milestones)
 */
export async function POST(request: NextRequest) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const body = await request.json();
        const { caseNumber, name, clientId, lawyerAssociations, court, judge, description, nextCourtDate } = body;

        if (!caseNumber) return errorResponse('VALIDATION_ERROR', 'Case number is required', 400, 'caseNumber');
        if (!name) return errorResponse('VALIDATION_ERROR', 'Matter name is required', 400, 'name');
        if (!clientId) return errorResponse('VALIDATION_ERROR', 'Client ID is required', 400, 'clientId');

        const client = await prisma.client.findFirst({
            where: { id: clientId, workspaceId: auth!.workspaceId },
            select: { id: true },
        });
        if (!client) return errorResponse('NOT_FOUND', 'Client not found in this workspace', 404, 'clientId');

        const result = await MatterService.createBasic(auth!.workspaceId, {
            caseNumber,
            name,
            clientId,
            userId: auth!.userId,
            court,
            judge,
            description,
            nextCourtDate,
            lawyerAssociations,
        });

        if (!result.success) return errorResponse('SERVER_ERROR', 'Failed to create matter', 500);

        await prisma.matterActivityLog.create({
            data: {
                matterId: result.data.id,
                activityType: 'api_action',
                description: 'Matter created via API',
                performedBy: auth!.userId,
            },
        });

        return successResponse(result.data);
    } catch (err: any) {
        console.error('Error creating matter:', err);
        if (err.code === 'P2002') {
            return errorResponse('VALIDATION_ERROR', 'Case number already exists', 400, 'caseNumber');
        }
        return errorResponse('SERVER_ERROR', 'Failed to create matter', 500);
    }
}
