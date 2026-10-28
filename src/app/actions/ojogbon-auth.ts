'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/services/auth/ratelimit';

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

    // Log in immediately; signIn throws the redirect on success.
    await signIn('credentials', { email, password, redirectTo: '/ojogbon/app' });
    return {};
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
