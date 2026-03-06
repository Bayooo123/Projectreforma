
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { validatePasswordResetToken } from '@/lib/services/auth/tokens';
import { logSecurityEvent, SecurityEvent } from '@/lib/services/auth/audit';

export async function POST(req: NextRequest) {
    try {
        const { token, password } = await req.json();

        if (!token || !password) {
            return NextResponse.json({ error: 'Missing token or password' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
        }

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
