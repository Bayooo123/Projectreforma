import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/app/actions/api-keys';

export interface ApiAuthContext {
    userId: string;
    userName: string | null;
    userEmail: string;
    workspaceId: string;
    workspaceName: string;
    workspaceSlug: string;
    role: string;
    apiKeyId: string;
    apiKeyName: string;
}

/**
 * Middleware to validate API key authentication
 * Returns the auth context if valid, or an error response
 */
export async function withApiAuth(
    request: NextRequest
): Promise<{ auth: ApiAuthContext | null; error: NextResponse | null }> {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
        return {
            auth: null,
            error: NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Missing Authorization header',
                    },
                },
                { status: 401 }
            ),
        };
    }

    // Extract Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return {
            auth: null,
            error: NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Invalid Authorization header format. Use: Bearer <api_key>',
                    },
                },
                { status: 401 }
            ),
        };
    }

    const apiKey = parts[1];

    // Validate the API key
    const result = await validateApiKey(apiKey);

    if (!result.success || !result.data) {
        return {
            auth: null,
            error: NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: result.error || 'Invalid API key',
                    },
                },
                { status: 401 }
            ),
        };
    }

    return { auth: result.data as ApiAuthContext, error: null };
}

/**
 * Check if user has required role
 */
export function hasRole(auth: ApiAuthContext, allowedRoles: string[]): boolean {
    return allowedRoles.includes(auth.role);
}

/**
 * Create a forbidden response
 */
export function forbiddenResponse(message = 'Insufficient permissions'): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: {
                code: 'FORBIDDEN',
                message,
            },
        },
        { status: 403 }
    );
}

/**
 * Create a success response
 */
export function successResponse<T>(data: T, meta?: Record<string, any>): NextResponse {
    return NextResponse.json({
        success: true,
        data,
        meta: {
            timestamp: new Date().toISOString(),
            ...meta,
        },
    });
}

/**
 * Create an error response
 */
export function errorResponse(
    code: string,
    message: string,
    status = 400,
    field?: string
): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: {
                code,
                message,
                ...(field && { field }),
            },
        },
        { status }
    );
}

/**
 * Create a not found response
 */
export function notFoundResponse(resource = 'Resource'): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: `${resource} not found`,
            },
        },
        { status: 404 }
    );
}
