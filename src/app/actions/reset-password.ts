'use server';

import { generatePasswordResetToken } from '@/lib/tokens';
import { sendPasswordResetEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export interface ResetState {
    success?: boolean;
    error?: string;
    message?: string;
}

export async function resetPassword(state: ResetState, formData: FormData): Promise<ResetState> {
    const email = formData.get('email') as string;

    if (!email) {
        return { error: 'Email is required' };
    }

    const start = Date.now();
    try {
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        // Always return success even if user doesn't exist (Security best practice)
        if (!existingUser) {
            // Fake delay to prevent timing attacks
            const duration = Date.now() - start;
            if (duration < 300) await new Promise(r => setTimeout(r, 300 - duration));
            return { success: true, message: 'If an account exists, a reset email has been sent.' };
        }

        const verificationToken = await generatePasswordResetToken(email);
        const domain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const resetLink = `${domain}/auth/reset-password?token=${verificationToken.token}`;

        await sendPasswordResetEmail({
            to: email,
            resetLink
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
    if (!password || password.length < 6) return { error: 'Password must be at least 6 characters' };
    if (password !== confirmPassword) return { error: 'Passwords do not match' };

    try {
        const existingToken = await prisma.verificationToken.findFirst({
            where: { token }
        });

        if (!existingToken) {
            return { error: 'Invalid or expired token' };
        }

        const hasExpired = new Date(existingToken.expires) < new Date();
        if (hasExpired) {
            return { error: 'Token has expired' };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { email: existingToken.identifier },
            data: { password: hashedPassword }
        });

        await prisma.verificationToken.delete({
            where: {
                identifier_token: {
                    identifier: existingToken.identifier,
                    token: existingToken.token
                }
            }
        });

        return { success: true, message: 'Password updated successfully!' };

    } catch (error) {
        console.error('Update password error:', error);
        return { error: 'Failed to update password' };
    }
}
