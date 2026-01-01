import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth, successResponse, errorResponse, notFoundResponse } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/briefs/:id
 * Get a single brief by ID
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const brief = await prisma.brief.findFirst({
            where: {
                id: params.id,
                workspaceId: auth!.workspaceId,
            },
            include: {
                client: { select: { id: true, name: true, email: true } },
                lawyer: { select: { id: true, name: true, email: true } },
                documents: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        size: true,
                        url: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
                activityLogs: {
                    select: {
                        id: true,
                        action: true,
                        performedBy: { select: { name: true } },
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
            },
        });

        if (!brief) {
            return notFoundResponse('Brief');
        }

        return successResponse({
            ...brief,
            activities: brief.activityLogs.map(log => ({
                id: log.id,
                action: log.action,
                actor: log.performedBy?.name || 'System',
                timestamp: log.createdAt,
            })),
        });

    } catch (err) {
        console.error('Error fetching brief:', err);
        return errorResponse('SERVER_ERROR', 'Failed to fetch brief', 500);
    }
}

/**
 * PATCH /api/v1/briefs/:id
 * Update a brief
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        // Verify brief exists in workspace
        const existing = await prisma.brief.findFirst({
            where: {
                id: params.id,
                workspaceId: auth!.workspaceId,
            },
        });

        if (!existing) {
            return notFoundResponse('Brief');
        }

        const body = await request.json();
        const { name, lawyerId, status, category, description, dueDate } = body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (lawyerId !== undefined) updateData.lawyerId = lawyerId;
        if (status !== undefined) updateData.status = status;
        if (category !== undefined) updateData.category = category;
        if (description !== undefined) updateData.description = description;
        if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

        const brief = await prisma.brief.update({
            where: { id: params.id },
            data: updateData,
            include: {
                client: { select: { id: true, name: true } },
                lawyer: { select: { id: true, name: true } },
            },
        });

        // Log activity
        await prisma.briefActivityLog.create({
            data: {
                briefId: brief.id,
                action: `Brief updated via API: ${Object.keys(updateData).join(', ')}`,
                performedById: auth!.userId,
                metadata: { source: 'bica_api', changes: updateData },
            },
        });

        return successResponse(brief);

    } catch (err) {
        console.error('Error updating brief:', err);
        return errorResponse('SERVER_ERROR', 'Failed to update brief', 500);
    }
}

/**
 * DELETE /api/v1/briefs/:id
 * Delete a brief
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    // Only owners/partners can delete
    if (!['owner', 'partner'].includes(auth!.role)) {
        return errorResponse('FORBIDDEN', 'Only owners and partners can delete briefs', 403);
    }

    try {
        const brief = await prisma.brief.findFirst({
            where: {
                id: params.id,
                workspaceId: auth!.workspaceId,
            },
        });

        if (!brief) {
            return notFoundResponse('Brief');
        }

        await prisma.brief.delete({
            where: { id: params.id },
        });

        return successResponse({ deleted: true });

    } catch (err) {
        console.error('Error deleting brief:', err);
        return errorResponse('SERVER_ERROR', 'Failed to delete brief', 500);
    }
}
