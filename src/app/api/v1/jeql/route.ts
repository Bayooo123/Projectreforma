import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiAuth, successResponse, errorResponse } from '@/lib/api-auth';
import { JEQLCompiler } from '@/lib/jeql/compiler';
import { JEQLException } from '@/lib/jeql/exceptions';

const compiler = new JEQLCompiler();

/**
 * POST /api/v1/jeql
 * Execute a JEQL query
 * Body: { "scope": "matter", "query": { ...JEQL Operations... } }
 */
export async function POST(request: NextRequest) {
    const { auth, error } = await withApiAuth(request);
    if (error) return error;

    try {
        const { scope, query } = await request.json();

        // Map scope to Prisma model name
        const modelName = scope.charAt(0).toUpperCase() + scope.slice(1).replace(/s$/, '');
        const normalizedScope = scope.toLowerCase().replace(/s$/, '');
        
        // @ts-ignore
        const model = (prisma as any)[scope] || (prisma as any)[normalizedScope] || (prisma as any)[scope + 's'];
        
        if (!model || typeof model.findMany !== 'function') {
            return errorResponse('VALIDATION_ERROR', `Invalid scope: '${scope}'`, 400, 'scope');
        }

        // Compile JEQL to Prisma args
        const prismaArgs = compiler.compile(query || {}, modelName);

        // Always enforce workspace isolation
        prismaArgs.where = {
            ...(prismaArgs.where || {}),
            workspaceId: auth!.workspaceId
        };

        // Execute query
        const data = await model.findMany(prismaArgs);

        return successResponse(data);

    } catch (err: any) {
        if (err instanceof JEQLException) {
            return errorResponse('JEQL_ERROR', err.message, 400);
        }
        console.error('JEQL Execution Error:', err);
        return errorResponse('SERVER_ERROR', 'Failed to execute JEQL query', 500);
    }
}
