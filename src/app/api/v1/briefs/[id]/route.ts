import { NextRequest } from 'next/server';
import { withApiAuth, successResponse, errorResponse, notFoundResponse } from '@/lib/api-auth';
import { BriefService } from '@/lib/services/briefs/brief-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/briefs/:id
 * Get a single brief by ID
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const brief = await BriefService.getById(id, auth!.workspaceId);
        if (!brief) return notFoundResponse('Brief');
        return successResponse(brief);
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
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const existing = await BriefService.getById(id, auth!.workspaceId);
        if (!existing) return notFoundResponse('Brief');

        const body = await request.json();
        const { name, lawyerId, status, category, description, dueDate } = body;

        const patch: Record<string, any> = {};
        if (name !== undefined) patch.name = name;
        if (lawyerId !== undefined) patch.lawyerId = lawyerId;
        if (status !== undefined) patch.status = status;
        if (category !== undefined) patch.category = category;
        if (description !== undefined) patch.description = description;
        if (dueDate !== undefined) patch.dueDate = dueDate ? new Date(dueDate) : null;

        const result = await BriefService.update(id, patch);
        if (!result.success) return errorResponse('SERVER_ERROR', result.error ?? 'Failed to update', 500);

        return successResponse(result.data);
    } catch (err) {
        console.error('Error updating brief:', err);
        return errorResponse('SERVER_ERROR', 'Failed to update brief', 500);
    }
}

/**
 * DELETE /api/v1/briefs/:id
 * Soft-delete a brief (sets deletedAt + status=archived)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    if (!['owner', 'partner'].includes(auth!.role)) {
        return errorResponse('FORBIDDEN', 'Only owners and partners can delete briefs', 403);
    }

    try {
        const result = await BriefService.softDelete(id, auth!.workspaceId);
        if (!result.success) {
            if (result.error === 'Brief not found') return notFoundResponse('Brief');
            return errorResponse('SERVER_ERROR', result.error ?? 'Failed to delete', 500);
        }
        return successResponse({ deleted: true });
    } catch (err) {
        console.error('Error deleting brief:', err);
        return errorResponse('SERVER_ERROR', 'Failed to delete brief', 500);
    }
}
