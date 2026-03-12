
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { JEQLCompiler } from '@/lib/jeql/compiler';
import { JEQLQuery } from '@/lib/jeql/types';

const SHARED_SECRET = process.env.BICA_SHARED_SECRET || 'dev_secret_keys';

// --- AUTHENTICATION ---

async function verifySignature(req: NextRequest, body: string): Promise<boolean> {
    const signatureHeader = req.headers.get('X-Custom-Platform-Signature');
    if (!signatureHeader) return false;

    const computedSignature = crypto
        .createHmac('sha256', SHARED_SECRET)
        .update(body)
        .digest('hex');

    try {
        return crypto.timingSafeEqual(
            Buffer.from(signatureHeader),
            Buffer.from(computedSignature)
        );
    } catch {
        return false;
    }
}

function validateTimestamp(timestamp: string): boolean {
    const requestTime = new Date(timestamp).getTime();
    const currentTime = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    return Math.abs(currentTime - requestTime) <= fiveMinutes;
}

// --- HANDLERS ---

async function handleLookup(payload: any, workspaceId: string) {
    const { query_lang, scope, operations } = payload;
    if (query_lang !== 'jeql') {
        throw new Error('Only JEQL is supported for lookups');
    }

    const compiler = new JEQLCompiler();
    const prismaArgs = compiler.compile(operations as JEQLQuery);

    // Ensure workspace scoping
    prismaArgs.where = {
        ...prismaArgs.where,
        workspaceId: workspaceId
    };

    const modelName = scope.charAt(0).toLowerCase() + scope.slice(1);
    // Use dynamic prisma collection
    const records = await (prisma as any)[modelName].findMany(prismaArgs);

    return {
        records: records.map((record: any) => ({
            id: record.id,
            label: record.name || record.title || record.caseNumber || record.briefNumber || record.id,
            secondary_label: record.description || record.email || record.status || '',
            confidence: 1.0
        }))
    };
}

async function handleWrite(payload: any, workspaceId: string) {
    const { action, model, parameters } = payload;
    const modelName = model.charAt(0).toLowerCase() + model.slice(1);
    const modelDelegate = (prisma as any)[modelName];

    if (!modelDelegate) throw new Error(`Model ${model} not found`);

    let affectedRecords: any[] = [];
    let summary = '';

    // Enforce workspaceId on parameters
    const paramsWithScope = { ...parameters, workspaceId };

    switch (action) {
        case 'create':
            const created = await modelDelegate.create({ data: paramsWithScope });
            affectedRecords = [{ id: created.id, model }];
            summary = `Successfully created ${model}`;
            break;
        case 'update':
            const { id, ...updateData } = parameters;
            const updated = await modelDelegate.update({
                where: { id, workspaceId },
                data: updateData
            });
            affectedRecords = [{ id: updated.id, model }];
            summary = `Successfully updated ${model}`;
            break;
        case 'delete':
            await modelDelegate.delete({
                where: { id: parameters.id, workspaceId }
            });
            summary = `Successfully deleted ${model}`;
            break;
        default:
            throw new Error(`Unsupported action: ${action}`);
    }

    return { affected_records: affectedRecords, summary };
}

async function handleInsight(payload: any, workspaceId: string) {
    const { query } = payload;

    // WARNING: Extreme caution with raw SQL. This is a simplified implementation.
    // In production, use parameter binding or a safe SQL builder.
    const queryUpper = query.toUpperCase();
    if (!queryUpper.includes('WHERE')) {
        throw new Error('All analytic queries must specify a workspace context');
    }

    // Attempt to inject workspace constraint if not perfectly formed
    // This is still risky; a better approach is required for production
    const isolatedQuery = query.replace(/;/g, '') + ` AND workspaceId = '${workspaceId}'`;

    const results = await prisma.$queryRawUnsafe(isolatedQuery);
    return results;
}

// --- MAIN ROUTE ---

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();

        // 1. Verify Signature
        if (!(await verifySignature(req, rawBody))) {
            return NextResponse.json({ status: 'failed', error: { code: 'UNAUTHORIZED', message: 'Invalid signature' } }, { status: 401 });
        }

        const body = JSON.parse(rawBody);
        const { operation_type, operation_id, payload, user_context, timestamp } = body;

        // 2. Validate Timestamp
        if (!validateTimestamp(timestamp)) {
            return NextResponse.json({ status: 'failed', error: { code: 'UNAUTHORIZED', message: 'Request stale' } }, { status: 401 });
        }

        // 3. Authorization & Workspace Scoping
        const member = await prisma.workspaceMember.findFirst({
            where: { userId: user_context.external_user_id },
            include: { workspace: true }
        });

        if (!member) {
            return NextResponse.json({ status: 'failed', error: { code: 'UNAUTHORIZED', message: 'User not found or no workspace access' } }, { status: 401 });
        }

        const workspaceId = member.workspaceId;

        // 4. Idempotency using SecurityAuditLog
        const existingLog = await prisma.securityAuditLog.findFirst({
            where: {
                event: 'BICA_EXECUTE_IDEMPOTENCY',
                description: operation_id
            }
        });

        if (existingLog && existingLog.metadata) {
            return NextResponse.json({ status: 'success', data: existingLog.metadata, error: null });
        }

        // 5. Route Operations
        let resultData: any;
        switch (operation_type) {
            case 'lookup':
                resultData = await handleLookup(payload, workspaceId);
                break;
            case 'write':
                resultData = await handleWrite(payload, workspaceId);
                break;
            case 'insight':
                resultData = await handleInsight(payload, workspaceId);
                break;
            default:
                throw new Error(`Unsupported operation type: ${operation_type}`);
        }

        // 6. Log for Idempotency
        await prisma.securityAuditLog.create({
            data: {
                userId: user_context.external_user_id,
                event: 'BICA_EXECUTE_IDEMPOTENCY',
                description: operation_id,
                metadata: resultData as any
            }
        });

        return NextResponse.json({
            status: 'success',
            data: resultData,
            error: null
        });

    } catch (error: any) {
        console.error('Bica Execution Error:', error);
        return NextResponse.json({
            status: 'failed',
            data: null,
            error: {
                code: error.code || 'SERVER_ERROR',
                message: error.message || 'An unexpected error occurred'
            }
        }, { status: 500 });
    }
}
