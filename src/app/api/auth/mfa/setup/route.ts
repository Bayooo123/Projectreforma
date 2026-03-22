/**
 * POST /api/auth/mfa/setup
 *
 * Authenticated users call this to begin MFA enrollment.
 * Returns a QR code data URL the user scans with their authenticator app.
 * The secret is saved to the DB as `mfaPendingSecret` until confirmed via /verify.
 *
 * Note: mfaEnabled remains false until the user successfully verifies a TOTP token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateMfaSecret, getMfaQrCode } from '@/lib/services/auth/mfa';
import { logSecurityEvent, SecurityEvent } from '@/lib/services/auth/audit';

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { email: true, mfaEnabled: true },
        });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        if (user.mfaEnabled) {
            return NextResponse.json({ error: 'MFA is already enabled for this account.' }, { status: 400 });
        }

        const { secret, otpauthUri } = generateMfaSecret(user.email!);
        const qrCode = await getMfaQrCode(otpauthUri);

        // Store the pending secret (not yet confirmed)
        await prisma.user.update({
            where: { id: session.user.id },
            data: { mfaSecret: secret },
        });

        await logSecurityEvent({
            userId: session.user.id,
            event: SecurityEvent.MFA_SETUP_INITIATED,
            description: 'User initiated MFA setup',
            req,
        });

        return NextResponse.json({
            qrCode,
            message: 'Scan the QR code in your authenticator app, then call /api/auth/mfa/verify to confirm.',
        });
    } catch (error) {
        console.error('[MFA Setup] Error:', error);
        return NextResponse.json({ error: 'Failed to set up MFA' }, { status: 500 });
    }
}

/**
 * DELETE /api/auth/mfa/setup
 * Disables MFA for the authenticated user (requires a valid TOTP token in body).
 */
export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { token } = await req.json();
        if (!token) {
            return NextResponse.json({ error: 'Current TOTP token is required to disable MFA.' }, { status: 400 });
        }

        const { verifyMfaToken } = await import('@/lib/services/auth/mfa');
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { mfaSecret: true, mfaEnabled: true },
        });
        if (!user?.mfaEnabled || !user.mfaSecret) {
            return NextResponse.json({ error: 'MFA is not enabled.' }, { status: 400 });
        }
        if (!verifyMfaToken(user.mfaSecret, token)) {
            return NextResponse.json({ error: 'Invalid TOTP token.' }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: { mfaEnabled: false, mfaSecret: null },
        });

        await logSecurityEvent({
            userId: session.user.id,
            event: SecurityEvent.MFA_DISABLED,
            description: 'User disabled MFA',
            req,
        });

        return NextResponse.json({ message: 'MFA has been disabled.' });
    } catch (error) {
        console.error('[MFA Disable] Error:', error);
        return NextResponse.json({ error: 'Failed to disable MFA' }, { status: 500 });
    }
}
