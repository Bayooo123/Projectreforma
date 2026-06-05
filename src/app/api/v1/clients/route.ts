import { NextRequest } from 'next/server';
import { withApiAuth, successResponse, errorResponse } from '@/lib/api-auth';
import { ClientService } from '@/lib/services/clients/client-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/clients
 * List clients in the workspace
 */
export async function GET(request: NextRequest) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? undefined;
    const search = searchParams.get('search') ?? undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
        const { data, meta } = await ClientService.list(auth!.workspaceId, {
            status,
            query: search,
            limit,
            offset,
        });

        return successResponse(
            data.map(c => ({
                id: c.id,
                name: c.name,
                email: c.email,
                phone: c.phone,
                company: c.company,
                industry: c.industry,
                status: c.status,
                activeMatters: c.activeMatters,
                createdAt: c.createdAt,
            })),
            { total: meta.total, limit, offset }
        );
    } catch (err) {
        console.error('Error fetching clients:', err);
        return errorResponse('SERVER_ERROR', 'Failed to fetch clients', 500);
    }
}

/**
 * POST /api/v1/clients
 * Create a new client
 */
export async function POST(request: NextRequest) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const body = await request.json();
        const { name, email, phone, company, industry } = body;

        if (!name) return errorResponse('VALIDATION_ERROR', 'Client name is required', 400, 'name');

        const result = await ClientService.create({
            name,
            email,
            phone,
            company,
            industry,
            workspaceId: auth!.workspaceId,
        });

        if (!result.success) {
            if (result.error?.includes('email')) {
                return errorResponse('VALIDATION_ERROR', result.error, 400, 'email');
            }
            return errorResponse('SERVER_ERROR', result.error ?? 'Failed to create client', 500);
        }

        return successResponse(result.data);
    } catch (err: any) {
        console.error('Error creating client:', err);
        if (err.code === 'P2002') {
            return errorResponse('VALIDATION_ERROR', 'Client with this email already exists', 400, 'email');
        }
        return errorResponse('SERVER_ERROR', 'Failed to create client', 500);
    }
}
