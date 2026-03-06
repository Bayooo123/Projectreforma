
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPasswordResetToken } from '@/lib/services/auth/tokens';
import { mailService } from '@/lib/services/mail/mail';
import { getPasswordResetEmail } from '@/lib/services/mail/templates';
import { logSecurityEvent, SecurityEvent } from '@/lib/services/auth/audit';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Generic response to prevent email enumeration
        const genericResponse = NextResponse.json({
            message: 'If an account exists with that email, a reset link has been sent.'
        });

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            // Still log the attempt for audit purposes (potential enumeration)
            await logSecurityEvent({
                event: SecurityEvent.PASSWORD_RESET_REQUEST,
                description: `Password reset requested for non-existent email: ${email}`,
                req
            });
            return genericResponse;
        }

        // Generate Token
        const token = await createPasswordResetToken(user.id);
        const domain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const resetUrl = `${domain}/auth/reset-password?token=${token}`;

        // Send Email
        await mailService.send({
            to: user.email,
            subject: 'Reset your Reforma password',
            html: getPasswordResetEmail(resetUrl)
        });

        // Log security event
        await logSecurityEvent({
            userId: user.id,
            event: SecurityEvent.PASSWORD_RESET_REQUEST,
            description: `Password reset link sent to ${user.email}`,
            req
        });

        return genericResponse;
    } catch (error) {
        console.error('[ForgotPassword] Error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
