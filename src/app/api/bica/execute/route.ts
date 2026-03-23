
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { JEQLCompiler } from '@/lib/jeql/compiler';
import { JEQLQuery } from '@/lib/jeql/types';
import { executeCrudPayload, CrudParameterSet, CrudError } from '@/lib/bica/crud-engine';
import { morphRegistry, UnknownMorphTypeError, MorphEntityNotFoundError } from '@/lib/bica/morph-registry';
import { config } from '@/lib/config';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SHARED_SECRET = config.BICA_SHARED_SECRET;
// Set BICA_DISABLE_HMAC=true in .env to disable signature verification in development ONLY.
// Production should NEVER set this to true.
const DANGEROUSLY_DISABLE_HMAC = config.BICA_DISABLE_HMAC;
if (DANGEROUSLY_DISABLE_HMAC) {
    console.warn('⚠️ [BICA CONFIG] HMAC signature verification is DISABLED via BICA_DISABLE_HMAC env var. This must NOT be set in production.');
} else {
    console.log('[BICA CONFIG] ✅ HMAC signature verification is ENABLED.');
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

async function verifySignature(req: NextRequest, rawBody: string): Promise<boolean> {
    if (DANGEROUSLY_DISABLE_HMAC) {
        console.warn('⚠️ [BICA EXECUTE] HMAC signature verification is DANGEROUSLY DISABLED via environment variable.');
        return true;
    }

    const receivedSig = req.headers.get('X-Custom-Platform-Signature');
    if (!receivedSig) return false;

    const expected = crypto
        .createHmac('sha256', SHARED_SECRET)
        .update(rawBody)
        .digest('hex');

    try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(receivedSig));
    } catch {
        return false;
    }
}

function validateTimestamp(timestamp: string): boolean {
    const requestTime = new Date(timestamp).getTime();
    if (isNaN(requestTime)) return false;
    return Math.abs(Date.now() - requestTime) <= 5 * 60 * 1000; // ±5 minutes
}

// ---------------------------------------------------------------------------
// Entity + Workspace resolution
// ---------------------------------------------------------------------------

/**
 * Step 1: Resolve the platform entity by its type and ID using the MorphRegistry.
 * Throws if the type is unknown or the entity is not found.
 */
async function resolvePlatformEntity(type: string, id: string) {
    return morphRegistry.resolve(type, id);
}

/**
 * Step 2: Given a resolved entity and its type, find the associated workspaceId.
 *
 * - "user"  → look up WorkspaceMember by userId
 * - "firm"  → the entity IS the workspace; use its id directly
 */
async function resolveWorkspaceFromEntity(
    entityType: string,
    entity: Record<string, any>
): Promise<{ workspaceId: string; userId: string }> {
    switch (entityType) {
        case 'user': {
            const member = await prisma.workspaceMember.findFirst({
                where: { userId: entity.id },
                select: { workspaceId: true, userId: true },
            });
            if (!member) {
                throw Object.assign(
                    new Error(`User "${entity.id}" has no workspace membership.`),
                    { bicaCode: 'UNAUTHORIZED' }
                );
            }
            return { workspaceId: member.workspaceId, userId: entity.id };
        }
        case 'firm': {
            // The firm entity IS the workspace
            return { workspaceId: entity.id, userId: entity.id };
        }
        default:
            throw Object.assign(
                new Error(`No workspace resolution strategy defined for entity type "${entityType}".`),
                { bicaCode: 'SERVER_ERROR' }
            );
    }
}

// ---------------------------------------------------------------------------
// Label mapping — picks the best human-readable label for each model
// ---------------------------------------------------------------------------

function buildLabel(record: any, scope: string): string {
    return (
        record.name ||
        record.title ||
        record.caseNumber ||
        record.briefNumber ||
        record.id
    );
}

function buildSecondaryLabel(record: any): string {
    const parts: string[] = [];
    if (record.status) parts.push(`[${record.status}]`);
    if (record.email) parts.push(record.email);
    if (record.date) parts.push(`[${new Date(record.date).toISOString().slice(0, 10)}]`);
    if (record.dueDate) parts.push(`[Due: ${new Date(record.dueDate).toISOString().slice(0, 10)}]`);
    if (record.createdAt) parts.push(`[Added: ${new Date(record.createdAt).toISOString().slice(0, 10)}]`);
    return parts.slice(0, 3).join(' ').slice(0, 255);
}

const compiler = new JEQLCompiler();

// ---------------------------------------------------------------------------
// Handler: lookup (JEQL)
// ---------------------------------------------------------------------------

async function handleLookup(payload: any, workspaceId: string): Promise<any> {
    const { query_lang, scope, operations } = payload;

    if (query_lang !== 'jeql') {
        throw Object.assign(new Error('Only query_lang "jeql" is supported for lookups.'), { bicaCode: 'VALIDATION_ERROR' });
    }
    if (!scope) {
        throw Object.assign(new Error('lookup payload must include a "scope" field.'), { bicaCode: 'VALIDATION_ERROR' });
    }

    // Resolve scope → Prisma model key (accept both "clients" and "Client")
    const modelKey = scope.charAt(0).toLowerCase() + scope.slice(1);
    const delegate = (prisma as any)[modelKey];
    if (!delegate) {
        throw Object.assign(new Error(`Unknown scope: '${scope}'.`), { bicaCode: 'VALIDATION_ERROR' });
    }

    const prismaArgs = compiler.compile((operations || {}) as JEQLQuery);

    // Enforce workspace scope
    prismaArgs.where = { ...(prismaArgs.where || {}), workspaceId };

    const records = await delegate.findMany(prismaArgs);

    return {
        matches: records.map((r: any) => ({
            id: r.id,
            label: buildLabel(r, scope),
            secondaryLabel: buildSecondaryLabel(r),
            confidence: 1.0,
        })),
    };
}

// ---------------------------------------------------------------------------
// Handler: direct_lookup (text search)
// ---------------------------------------------------------------------------

async function handleDirectLookup(payload: any, workspaceId: string): Promise<any> {
    const { relationName, queryText } = payload;

    if (!relationName || typeof queryText !== 'string') {
        throw Object.assign(
            new Error('direct_lookup requires "relationName" and "queryText".'),
            { bicaCode: 'VALIDATION_ERROR' }
        );
    }

    const modelKey = relationName.charAt(0).toLowerCase() + relationName.slice(1);
    // Also try stripping trailing 's' for plural form
    const singularKey = modelKey.endsWith('s') ? modelKey.slice(0, -1) : modelKey;
    const delegate = (prisma as any)[modelKey] || (prisma as any)[singularKey];

    if (!delegate) {
        throw Object.assign(new Error(`Unknown relationName: '${relationName}'.`), { bicaCode: 'VALIDATION_ERROR' });
    }

    const term = queryText.trim();
    const searchWhere = {
        workspaceId,
        OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { title: { contains: term, mode: 'insensitive' } },
            { caseNumber: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
        ].filter(cond => {
            // keep conditions only for string fields that may exist
            return true; // Prisma ignores unknown field filters gracefully
        }),
    };

    let records: any[] = [];
    try {
        records = await delegate.findMany({ where: searchWhere, take: 20 });
    } catch (e: any) {
        // If some OR fields don't exist on the model, fall back to just name/title
        records = await delegate.findMany({
            where: {
                workspaceId,
                OR: [
                    { name: { contains: term, mode: 'insensitive' } },
                    { title: { contains: term, mode: 'insensitive' } },
                ],
            },
            take: 20,
        });
    }

    return {
        matches: records.map((r: any) => ({
            id: r.id,
            label: buildLabel(r, relationName),
            secondaryLabel: buildSecondaryLabel(r),
            confidence: 0.9,
        })),
    };
}

// ---------------------------------------------------------------------------
// Handler: write (Crud)
// ---------------------------------------------------------------------------

async function handleWrite(payload: any, workspaceId: string): Promise<any> {
    const { action, parameterSets } = payload;

    if (action !== 'Crud') {
        throw Object.assign(
            new Error(`Unsupported write action '${action}'. Only 'Crud' is supported.`),
            { bicaCode: 'VALIDATION_ERROR' }
        );
    }
    if (!Array.isArray(parameterSets)) {
        throw Object.assign(new Error('write payload must include a "parameterSets" array.'), { bicaCode: 'VALIDATION_ERROR' });
    }

    const results = await executeCrudPayload(parameterSets as CrudParameterSet[], workspaceId);
    return { results };
}

// ---------------------------------------------------------------------------
// Handler: preview (HTML card snippets)
// ---------------------------------------------------------------------------

async function handlePreview(payload: any, workspaceId: string): Promise<any> {
    const { model, ids } = payload;

    if (!model || !Array.isArray(ids) || ids.length === 0) {
        throw Object.assign(new Error('preview requires "model" and a non-empty "ids" array.'), { bicaCode: 'VALIDATION_ERROR' });
    }

    const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
    const delegate = (prisma as any)[modelKey];
    if (!delegate) {
        throw Object.assign(new Error(`Unknown model: '${model}'.`), { bicaCode: 'VALIDATION_ERROR' });
    }

    const records = await delegate.findMany({
        where: { id: { in: ids }, workspaceId },
    });

    const cardMap: Record<string, string> = {};
    for (const r of records) {
        const label = buildLabel(r, model);
        const secondaryLabel = buildSecondaryLabel(r);
        cardMap[r.id] = `<div class="bica-preview-card">
  <h4 style="margin:0 0 4px;font-size:14px;">${escapeHtml(label)}</h4>
  <p style="margin:0;font-size:12px;color:#666;">${escapeHtml(secondaryLabel)}</p>
  <span style="font-size:11px;color:#999;">${escapeHtml(model)} · ${escapeHtml(r.id)}</span>
</div>`;
    }

    return cardMap;
}

function escapeHtml(str: string): string {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

async function checkIdempotency(operationId: string): Promise<any | null> {
    const existing = await prisma.securityAuditLog.findFirst({
        where: { event: 'BICA_EXECUTE', description: operationId },
    });
    return existing?.metadata || null;
}

async function logIdempotency(userId: string, operationId: string, resultData: any): Promise<void> {
    await prisma.securityAuditLog.create({
        data: {
            userId,
            event: 'BICA_EXECUTE',
            description: operationId,
            metadata: resultData as any,
        },
    });
}

// ---------------------------------------------------------------------------
// Main route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
    let userId = 'unknown';

    try {
        const rawBody = await req.text();
        console.log('[BICA DEBUG] Raw body received:', JSON.stringify(rawBody));
        console.log('[BICA DEBUG] Body length:', rawBody.length);

        // 1. Verify HMAC signature
        if (!(await verifySignature(req, rawBody))) {
            return NextResponse.json(
                { status: 'failed', data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing signature.' } },
                { status: 401 }
            );
        }

        const body = JSON.parse(rawBody);
        const { operation_type, operation_id, payload, user_context, timestamp } = body;

        // 2. Validate timestamp (replay protection)
        if (!DANGEROUSLY_DISABLE_HMAC && (!timestamp || !validateTimestamp(timestamp))) {
            return NextResponse.json(
                { status: 'failed', data: null, error: { code: 'UNAUTHORIZED', message: 'Request timestamp outside ±5 minute window.' } },
                { status: 401 }
            );
        }

        // 3. Resolve entity and workspace from user_context
        // platform_entity_type is snake_case singular e.g. "user", "firm"
        const platformEntityType: string = user_context?.platform_entity_type;
        const platformEntityId: string   = user_context?.platform_entity_id;

        if (!platformEntityType || !platformEntityId) {
            return NextResponse.json(
                { status: 'failed', data: null, error: { code: 'UNAUTHORIZED', message: 'user_context must include platform_entity_type and platform_entity_id.' } },
                { status: 401 }
            );
        }

        // Step 1: Load the entity from the morph registry
        const entity = await resolvePlatformEntity(platformEntityType, platformEntityId);

        // Step 2: Derive workspace context from the entity
        const { workspaceId, userId: resolvedUserId } = await resolveWorkspaceFromEntity(platformEntityType, entity);
        userId = resolvedUserId;


        // 4. Idempotency check (skip for non-idempotent or test operations)
        if (operation_id && !body.test_mode) {
            const cached = await checkIdempotency(operation_id);
            if (cached) {
                return NextResponse.json({ status: 'success', data: cached, error: null });
            }
        }

        // 5. Route by operation_type
        let resultData: any;

        switch (operation_type) {
            case 'lookup':
                resultData = await handleLookup(payload, workspaceId);
                break;
            case 'direct_lookup':
                resultData = await handleDirectLookup(payload, workspaceId);
                break;
            case 'write':
                resultData = await handleWrite(payload, workspaceId);
                break;
            case 'preview':
                resultData = await handlePreview(payload, workspaceId);
                break;
            case 'insight':
                return NextResponse.json(
                    { status: 'failed', data: null, error: { code: 'UNSUPPORTED', message: 'Insight operations are not supported by this platform.' } },
                    { status: 422 }
                );
            default:
                return NextResponse.json(
                    { status: 'failed', data: null, error: { code: 'VALIDATION_ERROR', message: `Unknown operation_type: '${operation_type}'.` } },
                    { status: 400 }
                );
        }

        // 6. Log for idempotency
        if (operation_id && !body.test_mode) {
            await logIdempotency(userId, operation_id, resultData);
        }

        return NextResponse.json({ status: 'success', data: resultData, error: null });

    } catch (err: any) {
        console.error('[BICA EXECUTE]', err);

        const code =
            err.bicaCode ||
            (err instanceof CrudError ? err.code : null) ||
            (err instanceof UnknownMorphTypeError ? 'VALIDATION_ERROR' : null) ||
            (err instanceof MorphEntityNotFoundError ? 'NOT_FOUND' : null) ||
            'SERVER_ERROR';
        const httpStatus = code === 'UNAUTHORIZED' ? 401 : code === 'NOT_FOUND' ? 404 : code === 'VALIDATION_ERROR' ? 400 : 500;

        return NextResponse.json(
            { status: 'failed', data: null, error: { code, message: err.message || 'An unexpected error occurred.' } },
            { status: httpStatus }
        );
    }
}
