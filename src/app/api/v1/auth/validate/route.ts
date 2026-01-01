import { NextRequest } from 'next/server';
import { withApiAuth, successResponse } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/auth/validate
 * Validate an API key and return user/workspace context
 */
export async function GET(request: NextRequest) {
    const { auth, error } = await withApiAuth(request);

    if (error) {
        return error;
    }

    return successResponse({
        userId: auth!.userId,
        userName: auth!.userName,
        userEmail: auth!.userEmail,
        workspaceId: auth!.workspaceId,
        workspaceName: auth!.workspaceName,
        workspaceSlug: auth!.workspaceSlug,
        role: auth!.role,
    });
}
