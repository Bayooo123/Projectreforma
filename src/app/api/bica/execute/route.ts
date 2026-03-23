import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { morphRegistry, UnknownMorphTypeError, MorphEntityNotFoundError } from '@/lib/bica/morph-registry';
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
        if (!(await verifySignature(req, rawBody))) {
            return NextResponse.json(
                { status: 'failed', data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid signature.' } },
                { status: 401 }
            );
        }

        const body = JSON.parse(rawBody);
        const { operation_type, operation_id, payload, user_context, timestamp } = body;

        // 2. Replay Protection
        if (!DANGEROUSLY_DISABLE_HMAC && (!timestamp || !validateTimestamp(timestamp))) {
            return NextResponse.json(
                { status: 'failed', data: null, error: { code: 'UNAUTHORIZED', message: 'Stale request.' } },
                { status: 401 }
            );
        }

        // 3. Resolve Actor Entity
        const platformEntityType: string = user_context?.platform_entity_type;
        const platformEntityId: string = user_context?.platform_entity_id;

        if (!platformEntityType || !platformEntityId) {
            return NextResponse.json(
                { status: 'failed', data: null, error: { code: 'UNAUTHORIZED', message: 'Missing user_context.' } },
                { status: 401 }
            );
        }

        const platformEntity = await morphRegistry.resolve(platformEntityType, platformEntityId);
        
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
                    (err instanceof UnknownMorphTypeError ? 'VALIDATION_ERROR' : null) ||
                    (err instanceof MorphEntityNotFoundError ? 'NOT_FOUND' : null) ||
                    'SERVER_ERROR';
        
        const httpStatus = code === 'UNAUTHORIZED' ? 401 : code === 'NOT_FOUND' ? 404 : code === 'VALIDATION_ERROR' ? 400 : 500;

        return NextResponse.json(
            { status: 'failed', data: null, error: { code, message: err.message || 'Server error.' } },
            { status: httpStatus }
        );
    }
}
