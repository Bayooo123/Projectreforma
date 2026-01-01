import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateApiKey } from '@/app/actions/api-keys';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/auth/generate-key
 * Generate a new API key for the authenticated user
 * Requires session auth (web-based) to create the first key
 */
export async function POST(request: NextRequest) {
    try {
        // This endpoint requires session auth (not API key)
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Please log in to generate an API key' } },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { name, workspaceId, expiresInDays } = body;

        if (!name) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'API key name is required', field: 'name' } },
                { status: 400 }
            );
        }

        if (!workspaceId) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'Workspace ID is required', field: 'workspaceId' } },
                { status: 400 }
            );
        }

        // Verify user is a member of the workspace with sufficient permissions
        const membership = await prisma.workspaceMember.findFirst({
            where: {
                userId: session.user.id,
                workspaceId,
                role: { in: ['owner', 'partner'] }, // Only owners/partners can create API keys
            },
        });

        if (!membership) {
            return NextResponse.json(
                { success: false, error: { code: 'FORBIDDEN', message: 'Only owners and partners can generate API keys' } },
                { status: 403 }
            );
        }

        const result = await generateApiKey(
            session.user.id,
            workspaceId,
            name,
            expiresInDays
        );

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: { code: 'SERVER_ERROR', message: result.error } },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: result.data,
            meta: {
                timestamp: new Date().toISOString(),
                warning: 'Store this API key securely. It will not be shown again.',
            },
        });

    } catch (error) {
        console.error('Error generating API key:', error);
        return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to generate API key' } },
            { status: 500 }
        );
    }
}
