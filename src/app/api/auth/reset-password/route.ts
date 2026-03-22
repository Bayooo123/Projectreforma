
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { validatePasswordResetToken } from '@/lib/services/auth/tokens';
import { logSecurityEvent, SecurityEvent } from '@/lib/services/auth/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

const schema = z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(req: NextRequest) {
    // Rate limit: 5 requests per 15 minutes per IP
    const ip = getClientIp(req);
    const limited = await checkRateLimit(`reset-password:${ip}`, 5, 15 * 60 * 1000);
    if (limited) {
        return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    try {
        const body = await req.json();
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
        }
        const { token, password } = parsed.data;


        const resetRequest = await validatePasswordResetToken(token);

        if (!resetRequest) {
            return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
        }

        // Update password
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { id: resetRequest.userId },
            data: { password: hashedPassword }
        });

        // Log security event
        await logSecurityEvent({
            userId: resetRequest.userId,
            event: SecurityEvent.PASSWORD_RESET_SUCCESS,
            description: `Password reset successful for user ID: ${resetRequest.userId}`,
            req
        });

        return NextResponse.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('[ResetPassword] Error:', error);
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }
}
