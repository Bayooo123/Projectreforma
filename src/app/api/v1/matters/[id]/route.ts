import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth, successResponse, errorResponse, notFoundResponse } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/matters/:id
 * Get a single matter by ID
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const matter = await prisma.matter.findFirst({
            where: {
                id: params.id,
                workspaceId: auth!.workspaceId,
            },
            include: {
                client: { select: { id: true, name: true, email: true } },
                assignedLawyer: { select: { id: true, name: true, email: true } },
                briefs: {
                    select: {
                        id: true,
                        briefNumber: true,
                        name: true,
                        status: true,
                    },
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

        if (!matter) {
            return notFoundResponse('Matter');
        }

        return successResponse(matter);

    } catch (err) {
        console.error('Error fetching matter:', err);
        return errorResponse('SERVER_ERROR', 'Failed to fetch matter', 500);
    }
}

/**
 * PATCH /api/v1/matters/:id
 * Update a matter
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const existing = await prisma.matter.findFirst({
            where: {
                id: params.id,
                workspaceId: auth!.workspaceId,
            },
        });

        if (!existing) {
            return notFoundResponse('Matter');
        }

        const body = await request.json();
        const { name, status, court, judge, description, nextCourtDate, assignedLawyerId } = body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (status !== undefined) updateData.status = status;
        if (court !== undefined) updateData.court = court;
        if (judge !== undefined) updateData.judge = judge;
        if (description !== undefined) updateData.description = description;
        if (nextCourtDate !== undefined) updateData.nextCourtDate = nextCourtDate ? new Date(nextCourtDate) : null;
        if (assignedLawyerId !== undefined) updateData.assignedLawyerId = assignedLawyerId;

        const matter = await prisma.matter.update({
            where: { id: params.id },
            data: updateData,
            include: {
                client: { select: { id: true, name: true } },
                assignedLawyer: { select: { id: true, name: true } },
            },
        });

        // Log activity
        await prisma.matterActivityLog.create({
            data: {
                matterId: matter.id,
                action: `Matter updated via API: ${Object.keys(updateData).join(', ')}`,
                performedById: auth!.userId,
            },
        });

        return successResponse(matter);

    } catch (err) {
        console.error('Error updating matter:', err);
        return errorResponse('SERVER_ERROR', 'Failed to update matter', 500);
    }
}

/**
 * DELETE /api/v1/matters/:id
 * Delete a matter
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    if (!['owner', 'partner'].includes(auth!.role)) {
        return errorResponse('FORBIDDEN', 'Only owners and partners can delete matters', 403);
    }

    try {
        const matter = await prisma.matter.findFirst({
            where: {
                id: params.id,
                workspaceId: auth!.workspaceId,
            },
        });

        if (!matter) {
            return notFoundResponse('Matter');
        }

        await prisma.matter.delete({
            where: { id: params.id },
        });

        return successResponse({ deleted: true });

    } catch (err) {
        console.error('Error deleting matter:', err);
        return errorResponse('SERVER_ERROR', 'Failed to delete matter', 500);
    }
}
