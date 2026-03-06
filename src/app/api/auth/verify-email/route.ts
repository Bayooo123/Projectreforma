import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateEmailVerificationToken } from '@/lib/services/auth/tokens';
import { logSecurityEvent, SecurityEvent } from '@/lib/services/auth/audit';
import { checkRateLimit, getClientIp } from '@/lib/services/auth/ratelimit';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.redirect(new URL('/login?error=Invalid token', req.url));
    }

    // Rate Limiting: 10 attempts per 15 minutes per IP
    const ip = getClientIp(req.headers);
    const rl = await checkRateLimit({
        key: `verify-email:${ip}`,
        limit: 10,
        windowSeconds: 15 * 60,
    });

    if (!rl.success) {
        await logSecurityEvent({
            event: SecurityEvent.RATE_LIMIT_EXCEEDED,
            description: `Rate limit exceeded for verify-email attempt from IP: ${ip}`,
            req
        });
        return NextResponse.redirect(new URL('/login?error=Too many attempts. Please try again later.', req.url));
    }

    try {
        const verification = await validateEmailVerificationToken(token);

        if (!verification) {
            return NextResponse.redirect(new URL('/login?error=Token invalid or expired', req.url));
        }

        // Update user status
        await prisma.user.update({
            where: { id: verification.userId },
            data: { emailVerified: new Date() }
        });

        // Log the success event
        await logSecurityEvent({
            userId: verification.userId,
            event: SecurityEvent.EMAIL_VERIFICATION_SUCCESS,
            description: `Email verified successfully for ${verification.email}`,
            req
        });

        // Redirect to login with success message
        return NextResponse.redirect(new URL('/login?message=Email verified successfully. You can now log in.', req.url));
    } catch (error) {
        console.error('[VerifyEmail] Error:', error);
        return NextResponse.redirect(new URL('/login?error=An error occurred during verification', req.url));
    }
}
