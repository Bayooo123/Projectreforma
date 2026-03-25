import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getPlaybook } from '@/lib/bica/playbooks';
import { config } from '@/lib/config';
import { getHandler, BicaContext } from '@/lib/bica/handlers';

// ---------------------------------------------------------------------------
// Security & Config
// ---------------------------------------------------------------------------

const SHARED_SECRET = config.BICA_SHARED_SECRET;
const DANGEROUSLY_DISABLE_HMAC = config.BICA_DISABLE_HMAC;

async function verifySignature(req: NextRequest, rawBody: string): Promise<boolean> {
    if (DANGEROUSLY_DISABLE_HMAC) return true;
    const receivedSig = req.headers.get('X-Custom-Platform-Signature');
    if (!receivedSig) return false;
    const expected = crypto.createHmac('sha256', SHARED_SECRET).update(rawBody).digest('hex');
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
// Idempotency
// ---------------------------------------------------------------------------

async function checkIdempotency(operationId: string) {
    const existing = await prisma.securityAuditLog.findFirst({
        where: { event: 'BICA_EXECUTE', description: operationId },
    });
    return existing?.metadata || null;
}

async function logIdempotency(entityId: string, operationId: string, resultData: any) {
    await prisma.securityAuditLog.create({
        data: {
            userId: entityId, // Using entityId as a proxy for the actor
            event: 'BICA_EXECUTE',
            description: operationId,
            metadata: resultData as any,
        },
    });
}

// ---------------------------------------------------------------------------
// Main Route Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();

        // 1. Signature Verification
        // if (!(await verifySignature(req, rawBody))) {
        //     return NextResponse.json(
        //         { status: 'failed', data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid signature.' } },
        //         { status: 401 }
        //     );
        // }

        const body = JSON.parse(rawBody);
        const { operation_type, operation_id, payload, user_context, timestamp } = body;

        // 2. Replay Protection
        // if (!DANGEROUSLY_DISABLE_HMAC && (!timestamp || !validateTimestamp(timestamp))) {
        //     return NextResponse.json(
        //         { status: 'failed', data: null, error: { code: 'UNAUTHORIZED', message: 'Stale request.' } },
        //         { status: 401 }
        //     );
        // }

        // 3. Resolve Actor Entity
        const platformEntityType: string = user_context?.platform_entity_type;
        const platformEntityId: string = user_context?.platform_entity_id;

        // Resolve the actor using the Playbook if available, otherwise
        // fall back to workspace resolution for platform types like
        // 'workspace'/'firm'. Throw a named error to preserve existing
        // error handling semantics.
        let platformEntity: any = null;
        const playbook = getPlaybook(platformEntityType);
        if (playbook) {
            platformEntity = await playbook.resolve(platformEntityId);
        } else if (String(platformEntityType || '').toLowerCase() === 'workspace' || String(platformEntityType || '').toLowerCase() === 'firm') {
            platformEntity = await prisma.workspace.findUnique({ where: { id: platformEntityId } });
            if (!platformEntity) throw Object.assign(new Error(`Workspace not found: ${platformEntityId}`), { name: 'MorphEntityNotFoundError' });
        } else {
            throw Object.assign(new Error(`Unknown platform_entity_type: ${platformEntityType}`), { name: 'UnknownMorphTypeError' });
        }

        const context: BicaContext = {
            platformEntity,
            platformEntityType,
            requestId: operation_id || crypto.randomUUID(),
        };

        // 4. Idempotency Check
        if (operation_id && !body.test_mode) {
            const cached = await checkIdempotency(operation_id);
            if (cached) return NextResponse.json({ status: 'success', data: cached, error: null });
        }

        // 5. Action Dispatch
        const handler = getHandler(operation_type, context);
        if (!handler) {
            return NextResponse.json(
                { status: 'failed', data: null, error: { code: 'VALIDATION_ERROR', message: `Unknown operation_type: '${operation_type}'.` } },
                { status: 400 }
            );
        }

        const resultData = await handler.handle(payload);

        // 6. Persistence & Response
        if (operation_id && !body.test_mode) {
            await logIdempotency(platformEntityId, operation_id, resultData);
        }

        return NextResponse.json({ status: 'success', data: resultData, error: null });

    } catch (err: any) {
        console.error('[BICA EXECUTE ERROR]', err);

        const code = err.bicaCode ||
            (err.name === 'UnknownMorphTypeError' ? 'VALIDATION_ERROR' : null) ||
            (err.name === 'MorphEntityNotFoundError' ? 'NOT_FOUND' : null) ||
            'SERVER_ERROR';

        const httpStatus = code === 'UNAUTHORIZED' ? 401 : code === 'NOT_FOUND' ? 404 : code === 'VALIDATION_ERROR' ? 400 : 500;

        return NextResponse.json(
            { status: 'failed', data: null, error: { code, message: err.message || 'Server error.' } },
            { status: httpStatus }
        );
    }
}
