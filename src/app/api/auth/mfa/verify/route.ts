/**
 * POST /api/auth/mfa/verify
 *
 * Confirms MFA enrollment by verifying the first TOTP token submitted by the user.
 * On success, sets mfaEnabled = true in the database.
 *
 * This endpoint is also reusable as a step-up authentication check for sensitive operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { verifyMfaToken } from '@/lib/services/auth/mfa';
import { logSecurityEvent, SecurityEvent } from '@/lib/services/auth/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

const schema = z.object({
    token: z.string().length(6, 'TOTP token must be 6 digits').regex(/^\d+$/, 'TOTP token must contain only digits'),
});

export async function POST(req: NextRequest) {
    // Rate limit: 10 attempts per 5 minutes per user IP
    const ip = getClientIp(req);
    const limited = await checkRateLimit(`mfa-verify:${ip}`, 10, 5 * 60 * 1000);
    if (limited) {
        return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid token format' }, { status: 400 });
        }
        const { token } = parsed.data;

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { mfaSecret: true, mfaEnabled: true },
        });

        if (!user?.mfaSecret) {
            return NextResponse.json({ error: 'MFA setup not initiated. Call /api/auth/mfa/setup first.' }, { status: 400 });
        }

        const isValid = verifyMfaToken(user.mfaSecret, token);
        if (!isValid) {
            await logSecurityEvent({
                userId: session.user.id,
                event: SecurityEvent.MFA_VERIFY_FAILED,
                description: 'Invalid TOTP token submitted during MFA verification',
                req,
            });
            return NextResponse.json({ error: 'Invalid or expired code. Please try again.' }, { status: 400 });
        }

        // Activate MFA
        await prisma.user.update({
            where: { id: session.user.id },
            data: { mfaEnabled: true },
        });

        await logSecurityEvent({
            userId: session.user.id,
            event: SecurityEvent.MFA_ENABLED,
            description: 'User successfully enabled MFA',
            req,
        });

        return NextResponse.json({
            success: true,
            message: 'MFA has been successfully enabled for your account.',
        });
    } catch (error) {
        console.error('[MFA Verify] Error:', error);
        return NextResponse.json({ error: 'Failed to verify MFA token' }, { status: 500 });
    }
}
