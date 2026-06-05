import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth, successResponse, errorResponse } from '@/lib/api-auth';
import { BriefService } from '@/lib/services/briefs/brief-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/briefs
 * List briefs in the workspace
 */
export async function GET(request: NextRequest) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? undefined;
    const lawyerId = searchParams.get('lawyerId') ?? undefined;
    const clientId = searchParams.get('clientId') ?? undefined;
    const category = searchParams.get('category') ?? undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
        const { briefs, total } = await BriefService.list(auth!.workspaceId, {
            status,
            lawyerId,
            clientId,
            category,
            limit,
            offset,
        });

        const data = briefs.map(brief => ({
            id: brief.id,
            briefNumber: brief.briefNumber,
            name: brief.name,
            category: brief.category,
            status: brief.status,
            client: brief.client || null,
            lawyer: brief.lawyer,
            documentsCount: brief._count.documents,
            createdAt: brief.createdAt,
            updatedAt: brief.updatedAt,
        }));

        return successResponse(data, { total, limit, offset });
    } catch (err) {
        console.error('Error fetching briefs:', err);
        return errorResponse('SERVER_ERROR', 'Failed to fetch briefs', 500);
    }
}

/**
 * POST /api/v1/briefs
 * Create a new brief
 */
export async function POST(request: NextRequest) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const body = await request.json();
        const { briefNumber, name, clientId, lawyerId, category, description, status, dueDate } = body;

        if (!briefNumber) return errorResponse('VALIDATION_ERROR', 'Brief number is required', 400, 'briefNumber');
        if (!name) return errorResponse('VALIDATION_ERROR', 'Brief name is required', 400, 'name');
        if (!clientId) return errorResponse('VALIDATION_ERROR', 'Client ID is required', 400, 'clientId');
        if (!category) return errorResponse('VALIDATION_ERROR', 'Category is required', 400, 'category');

        // Verify client belongs to workspace
        const client = await prisma.client.findFirst({
            where: { id: clientId, workspaceId: auth!.workspaceId },
            select: { id: true },
        });
        if (!client) return errorResponse('NOT_FOUND', 'Client not found in this workspace', 404, 'clientId');

        const result = await BriefService.create({
            briefNumber,
            name,
            clientId,
            lawyerId: lawyerId || auth!.userId,
            category,
            description,
            status: status || 'active',
            dueDate,
            workspaceId: auth!.workspaceId,
        });

        if (!result.success) {
            if (result.error?.includes('already exists')) {
                return errorResponse('VALIDATION_ERROR', 'Brief number already exists', 400, 'briefNumber');
            }
            return errorResponse('SERVER_ERROR', result.error ?? 'Failed to create brief', 500);
        }

        await prisma.briefActivityLog.create({
            data: {
                briefId: result.data.id,
                activityType: 'api_action',
                description: 'Brief created via API',
                performedBy: auth!.userId,
                metadata: { source: 'bica_api', apiKeyName: auth!.apiKeyName },
            },
        });

        return successResponse(result.data);
    } catch (err: any) {
        console.error('Error creating brief:', err);
        if (err.code === 'P2002') {
            return errorResponse('VALIDATION_ERROR', 'Brief number already exists', 400, 'briefNumber');
        }
        return errorResponse('SERVER_ERROR', 'Failed to create brief', 500);
    }
}
