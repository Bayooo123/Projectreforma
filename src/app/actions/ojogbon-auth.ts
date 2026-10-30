'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/services/auth/ratelimit';
import { createPasswordResetToken } from '@/lib/services/auth/tokens';
import { mailService } from '@/lib/services/mail/mail';
import { getOjogbonWelcomeEmail, getOjogbonPasswordResetEmail } from '@/lib/services/mail/templates';
import { logSecurityEvent, SecurityEvent } from '@/lib/services/auth/audit';
import { config } from '@/lib/config';

/**
 * Ojogbon accounts reuse Reforma's User table and NextAuth credentials login,
 * but never create a law-firm Workspace: an Ojogbon user is an individual
 * student or scholar. Signing up logs the person straight in and sends them
 * to the writing studio.
 */

export type OjogbonAuthState = {
    message?: string;
    fieldErrors?: Partial<Record<'name' | 'email' | 'password', string>>;
};

const SignUpSchema = z.object({
    name: z.string().trim().min(2, 'Enter your name'),
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    password: z.string().min(8, 'Use at least 8 characters'),
});

export async function ojogbonSignUp(
    _prev: OjogbonAuthState | undefined,
    formData: FormData,
): Promise<OjogbonAuthState> {
    const parsed = SignUpSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
    });
    if (!parsed.success) {
        const f = parsed.error.flatten().fieldErrors;
        return { fieldErrors: { name: f.name?.[0], email: f.email?.[0], password: f.password?.[0] } };
    }
    const { name, email, password } = parsed.data;

    const ip = getClientIp(await headers());
    const rl = await checkRateLimit({ key: `ojogbon-signup:${ip}`, limit: 5, windowSeconds: 15 * 60 });
    if (!rl.success) return { message: 'Too many sign-up attempts. Please wait a few minutes and try again.' };

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
        return {
            fieldErrors: { email: 'An account with this email already exists. Log in instead.' },
        };
    }

    try {
        await prisma.user.create({
            data: { name, email, password: await bcrypt.hash(password, 10) },
        });
    } catch (error) {
        console.error('Ojogbon sign-up failed:', error);
        return { message: 'We couldn’t create your account. Please try again.' };
    }

    // Best-effort — a failed welcome email shouldn't block account creation.
    mailService
        .send({ to: email, subject: 'Welcome to Ojogbon', html: getOjogbonWelcomeEmail(name) })
        .catch(err => console.error('Ojogbon welcome email failed:', err));

    // Log in immediately; signIn throws the redirect on success.
    await signIn('credentials', { email, password, redirectTo: '/ojogbon/app' });
    return {};
}

export type OjogbonForgotPasswordState = { success?: boolean; message?: string; error?: string };

/**
 * Ojogbon's own forgot-password request — same token/rate-limit machinery as
 * the firm product's resetPassword action (src/app/actions/reset-password.ts),
 * but pointed at /ojogbon/reset-password and sent with Ojogbon's own email
 * copy, so a student lands back in the studio's branding, not the firm app's.
 */
export async function ojogbonForgotPassword(
    _prev: OjogbonForgotPasswordState | undefined,
    formData: FormData,
): Promise<OjogbonForgotPasswordState> {
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    if (!email) return { error: 'Enter your email address.' };

    const genericMessage = 'If an account exists with that email, a reset link has been sent.';

    const ip = getClientIp(await headers());
    const rl = await checkRateLimit({ key: `ojogbon-forgot-password:${email}:${ip}`, limit: 5, windowSeconds: 15 * 60 });
    if (!rl.success) return { error: 'Too many requests. Please try again later.' };

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            await logSecurityEvent({
                event: SecurityEvent.PASSWORD_RESET_REQUEST,
                description: `Ojogbon password reset requested for non-existent email: ${email}`,
                metadata: { email, ip },
            });
            return { success: true, message: genericMessage };
        }

        const token = await createPasswordResetToken(user.id);
        const resetUrl = `${config.NEXT_PUBLIC_APP_URL}/ojogbon/reset-password?token=${token}`;
        await mailService.send({ to: user.email, subject: 'Reset your Ojogbon password', html: getOjogbonPasswordResetEmail(resetUrl) });

        await logSecurityEvent({
            userId: user.id,
            event: SecurityEvent.PASSWORD_RESET_REQUEST,
            description: `Ojogbon password reset link sent to ${user.email}`,
            metadata: { ip },
        });
        return { success: true, message: genericMessage };
    } catch (error) {
        console.error('Ojogbon forgot-password error:', error);
        return { error: 'Something went wrong. Please try again.' };
    }
}

export async function ojogbonLogIn(
    _prev: OjogbonAuthState | undefined,
    formData: FormData,
): Promise<OjogbonAuthState> {
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const password = String(formData.get('password') ?? '');
    if (!email || !password) return { message: 'Enter your email and password.' };

    try {
        await signIn('credentials', { email, password, redirectTo: '/ojogbon/app' });
        return {};
    } catch (error) {
        if (error instanceof AuthError) {
            const raw = (error.cause?.err as Error | undefined)?.message ?? '';
            if (raw.includes('Too many login attempts')) return { message: raw };
            if (raw === 'MFA_REQUIRED' || raw === 'MFA_INVALID') {
                return { message: 'This account uses two-step verification. Log in through reforma.ng/login.' };
            }
            return { message: 'Incorrect email or password.' };
        }
        throw error; // NEXT_REDIRECT on success
    }
}

export async function ojogbonLogOut() {
    await signOut({ redirectTo: '/ojogbon' });
}
