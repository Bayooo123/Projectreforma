'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { createPasswordResetToken } from '@/lib/services/auth/tokens';
import { mailService } from '@/lib/services/mail/mail';
import { getPasswordResetEmail } from '@/lib/services/mail/templates';
import { config } from '@/lib/config';

export async function changePassword(formData: FormData) {
    const session = await auth();

    if (!session || !session.user?.id) {
        return { error: 'Unauthorized' };
    }

    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return { error: 'All fields are required' };
    }

    if (newPassword !== confirmPassword) {
        return { error: 'New passwords do not match' };
    }

    if (newPassword.length < 6) {
        return { error: 'Password must be at least 6 characters' };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        });

        if (!user || !user.password) {
            return { error: 'User not found' };
        }

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return { error: 'Incorrect current password' };
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: session.user.id },
            data: { password: hashedPassword }
        });

        revalidatePath('/settings');
        return { success: true, message: 'Password updated successfully!' };
    } catch (error) {
        console.error('Change password error:', error);
        return { error: 'An error occurred. Please try again.' };
    }
}

/**
 * Sends a password reset link to the currently logged-in user's email.
 * Used from Settings > Security — no old password required.
 */
export async function sendPasswordResetFromSettings(): Promise<{ success?: boolean; message?: string; error?: string }> {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
        return { error: 'Not authenticated.' };
    }

    try {
        const token = await createPasswordResetToken(session.user.id);
        const resetLink = `${config.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;

        await mailService.send({
            to: session.user.email,
            subject: 'Reset your Reforma password',
            html: getPasswordResetEmail(resetLink),
        });

        return { success: true, message: `Reset link sent to ${session.user.email}. Check your inbox — it expires in 1 hour.` };
    } catch (error) {
        console.error('sendPasswordResetFromSettings error:', error);
        return { error: 'Failed to send reset email. Please try again.' };
    }
}
