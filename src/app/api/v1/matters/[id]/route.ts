import { NextRequest } from 'next/server';
import { withApiAuth, successResponse, errorResponse, notFoundResponse } from '@/lib/api-auth';
import { MatterService } from '@/lib/services/matters/matter-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/matters/:id
 * Get a single matter with lawyers and linked briefs
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const matter = await MatterService.getById(id, auth!.workspaceId);
        if (!matter) return notFoundResponse('Matter');
        return successResponse(matter);
    } catch (err) {
        console.error('Error fetching matter:', err);
        return errorResponse('SERVER_ERROR', 'Failed to fetch matter', 500);
    }
}

/**
 * PATCH /api/v1/matters/:id
 * Update a matter (supports lawyer association replacement)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const existing = await MatterService.getById(id, auth!.workspaceId);
        if (!existing) return notFoundResponse('Matter');

        const body = await request.json();
        const { name, status, court, judge, description, nextCourtDate, lawyerAssociations } = body;

        const patch: Record<string, any> = {};
        if (name !== undefined) patch.name = name;
        if (status !== undefined) patch.status = status;
        if (court !== undefined) patch.court = court;
        if (judge !== undefined) patch.judge = judge;
        if (description !== undefined) patch.description = description;
        if (nextCourtDate !== undefined) patch.nextCourtDate = nextCourtDate ? new Date(nextCourtDate) : null;
        if (lawyerAssociations !== undefined) patch.lawyerAssociations = lawyerAssociations;

        const result = await MatterService.update(id, patch);
        if (!result.success) return errorResponse('SERVER_ERROR', result.error ?? 'Failed to update', 500);

        return successResponse(result.data);
    } catch (err) {
        console.error('Error updating matter:', err);
        return errorResponse('SERVER_ERROR', 'Failed to update matter', 500);
    }
}

/**
 * DELETE /api/v1/matters/:id
 * Soft-delete a matter (sets deletedAt)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    if (!['owner', 'partner'].includes(auth!.role)) {
        return errorResponse('FORBIDDEN', 'Only owners and partners can delete matters', 403);
    }

    try {
        const result = await MatterService.softDelete(id, auth!.workspaceId);
        if (!result.success) {
            if (result.error === 'Matter not found') return notFoundResponse('Matter');
            return errorResponse('SERVER_ERROR', result.error ?? 'Failed to delete', 500);
        }
        return successResponse({ deleted: true });
    } catch (err) {
        console.error('Error deleting matter:', err);
        return errorResponse('SERVER_ERROR', 'Failed to delete matter', 500);
    }
}
