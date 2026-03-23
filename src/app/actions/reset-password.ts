'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createPasswordResetToken, validatePasswordResetToken } from '@/lib/services/auth/tokens';
import { mailService } from '@/lib/services/mail/mail';
import { getPasswordResetEmail } from '@/lib/services/mail/templates';
import { logSecurityEvent, SecurityEvent } from '@/lib/services/auth/audit';
import { checkRateLimit, getClientIp } from '@/lib/services/auth/ratelimit';
import { headers } from 'next/headers';
import { config } from '@/lib/config';

export interface ResetState {
    success?: boolean;
    error?: string;
    message?: string;
}

export async function resetPassword(state: ResetState, formData: FormData): Promise<ResetState> {
    const email = (formData.get('email') as string)?.toLowerCase();

    if (!email) {
        return { error: 'Email is required' };
    }

    const start = Date.now();
    try {
        // Rate Limiting: 3 requests per 15 mins per email/IP
        const h = await headers();
        const ip = getClientIp(h);
        const rl = await checkRateLimit({
            key: `forgot-password-action:${email}:${ip}`,
            limit: 3,
            windowSeconds: 15 * 60,
        });

        if (!rl.success) {
            return { error: 'Too many requests. Please try again later.' };
        }

        const user = await prisma.user.findUnique({
            where: { email }
        });

        const genericMessage = 'If an account exists, a reset email has been sent.';

        if (!user) {
            // Log attempt for audit (potential enumeration)
            await logSecurityEvent({
                event: SecurityEvent.PASSWORD_RESET_REQUEST,
                description: `Password reset requested for non-existent email: ${email}`,
                metadata: { email, ip }
            });

            // Fake delay
            const duration = Date.now() - start;
            if (duration < 300) await new Promise(r => setTimeout(r, 300 - duration));
            return { success: true, message: genericMessage };
        }

        // Generate Token
        const token = await createPasswordResetToken(user.id);
        const domain = config.NEXT_PUBLIC_APP_URL;
        const resetLink = `${domain}/auth/reset-password?token=${token}`;

        // Send Email using MailService
        await mailService.send({
            to: user.email,
            subject: 'Reset your Reforma password',
            html: getPasswordResetEmail(resetLink)
        });

        // Log security event
        await logSecurityEvent({
            userId: user.id,
            event: SecurityEvent.PASSWORD_RESET_REQUEST,
            description: `Password reset link sent to ${user.email}`,
            metadata: { ip }
        });

        return { success: true, message: 'Check your email for the reset link.' };

    } catch (error) {
        console.error('Reset password error:', error);
        return { error: 'Something went wrong. Please try again.' };
    }
}

export async function updatePassword(state: ResetState, formData: FormData): Promise<ResetState> {
    const token = formData.get('token') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!token) return { error: 'Missing token' };
    if (!password || password.length < 8) return { error: 'Password must be at least 8 characters' };
    if (password !== confirmPassword) return { error: 'Passwords do not match' };

    try {
        const h = await headers();
        const ip = getClientIp(h);

        // Rate Limiting: 5 attempts per token
        const rl = await checkRateLimit({
            key: `reset-password-action:${token}`,
            limit: 5,
            windowSeconds: 60 * 60,
        });

        if (!rl.success) {
            return { error: 'Too many attempts. Please try again later.' };
        }

        const resetRequest = await validatePasswordResetToken(token);

        if (!resetRequest) {
            return { error: 'Invalid or expired reset link' };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: resetRequest.userId },
            data: { password: hashedPassword }
        });

        // Log security event
        await logSecurityEvent({
            userId: resetRequest.userId,
            event: SecurityEvent.PASSWORD_RESET_SUCCESS,
            description: `Password reset successful via server action`,
            metadata: { ip }
        });

        return { success: true, message: 'Password updated successfully!' };

    } catch (error) {
        console.error('Update password error:', error);
        return { error: 'Failed to update password' };
    }
}
