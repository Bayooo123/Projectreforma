import { NextRequest } from 'next/server';
import { withApiAuth, successResponse, errorResponse, notFoundResponse } from '@/lib/api-auth';
import { ClientService } from '@/lib/services/clients/client-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/clients/:id
 * Get a single client with full details and financial summary
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const [client, matters, financialSummary] = await Promise.all([
            ClientService.getById(id, auth!.workspaceId),
            ClientService.getMatters(id, auth!.workspaceId),
            ClientService.getFinancialSummary(id),
        ]);

        if (!client) return notFoundResponse('Client');

        return successResponse({
            ...client,
            matters: matters.map(m => ({
                id: m.id,
                caseNumber: m.caseNumber,
                name: m.name,
                status: m.status,
                nextCourtDate: m.nextCourtDate,
            })),
            financialSummary,
        });
    } catch (err) {
        console.error('Error fetching client:', err);
        return errorResponse('SERVER_ERROR', 'Failed to fetch client', 500);
    }
}

/**
 * PATCH /api/v1/clients/:id
 * Update a client
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const existing = await ClientService.getById(id, auth!.workspaceId);
        if (!existing) return notFoundResponse('Client');

        const body = await request.json();
        const { name, email, phone, company, industry, status } = body;

        const patch: Record<string, any> = {};
        if (name !== undefined) patch.name = name;
        if (email !== undefined) patch.email = email;
        if (phone !== undefined) patch.phone = phone;
        if (company !== undefined) patch.company = company;
        if (industry !== undefined) patch.industry = industry;
        if (status !== undefined) patch.status = status;

        const result = await ClientService.update(id, patch);
        if (!result.success) return errorResponse('VALIDATION_ERROR', result.error ?? 'Failed to update', 400);

        return successResponse(result.data);
    } catch (err) {
        console.error('Error updating client:', err);
        return errorResponse('SERVER_ERROR', 'Failed to update client', 500);
    }
}

/**
 * DELETE /api/v1/clients/:id
 * Soft-delete (archive) a client
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    if (!['owner', 'partner'].includes(auth!.role)) {
        return errorResponse('FORBIDDEN', 'Only owners and partners can delete clients', 403);
    }

    try {
        const result = await ClientService.softDelete(id, auth!.workspaceId);
        if (!result.success) {
            if (result.error === 'Client not found') return notFoundResponse('Client');
            return errorResponse('SERVER_ERROR', result.error ?? 'Failed to delete', 500);
        }
        return successResponse({ archived: true });
    } catch (err) {
        console.error('Error deleting client:', err);
        return errorResponse('SERVER_ERROR', 'Failed to delete client', 500);
    }
}
