'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { auth } from '@/auth';
import { headers } from 'next/headers';
import { generateUniqueLawyerToken } from '@/lib/lawyer-tokens';
import { checkRateLimit, getClientIp } from '@/lib/services/auth/ratelimit';
import { createEmailVerificationToken } from '@/lib/services/auth/tokens';
import { mailService } from '@/lib/services/mail/mail';
import { getFirmOwnerWelcomeEmail } from '@/lib/services/mail/templates';
import { logSecurityEvent, SecurityEvent } from '@/lib/services/auth/audit';
import { config } from '@/lib/config';

export type ReformaXState = { message?: string; success?: boolean };

const PRACTICE_FOCUS_VALUES = ['LITIGATION_HEAVY', 'ACADEMIC_CAPACITY_BUILDING', 'CORPORATE_ADVISORY'] as const;
export type PracticeFocus = (typeof PRACTICE_FOCUS_VALUES)[number];

/**
 * Reforma X signup: an individual lawyer identifies by their Supreme Court
 * enrollment number rather than naming a firm up front. Creates the same
 * User + Workspace + WorkspaceMember shape the classic registration flow
 * does — a solo workspace they can rename or grow later — then signs them
 * straight in (consistent with this app's existing grace-period stance on
 * email verification: it's sent, not required before login).
 */
export async function signUpWithScn(prevState: ReformaXState | undefined, formData: FormData): Promise<ReformaXState> {
    const name = (formData.get('name') as string)?.trim();
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const scn = (formData.get('scn') as string)?.trim();
    const password = formData.get('password') as string;

    if (!name || !email || !scn || !password) {
        return { message: 'Please fill in all fields.' };
    }
    if (password.length < 8) {
        return { message: 'Password must be at least 8 characters.' };
    }

    const h = await headers();
    const ip = getClientIp(h);
    const rl = await checkRateLimit({ key: `signup-x:${ip}`, limit: 5, windowSeconds: 15 * 60 });
    if (!rl.success) {
        return { message: 'Too many signup attempts. Please try again later.' };
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const lawyerToken = await generateUniqueLawyerToken();
        const firmCode = nanoid(6).toUpperCase();
        const inviteLinkToken = nanoid(12);
        const workspaceName = `${name}'s Practice`;
        const slugBase = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const slug = `${slugBase}-${nanoid(5).toLowerCase()}`;

        const { user, workspace } = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: { name, email, password: hashedPassword, scn, lawyerToken },
            });
            const workspace = await tx.workspace.create({
                data: { name: workspaceName, slug, firmCode, inviteLinkToken, ownerId: user.id },
            });
            await tx.workspaceMember.create({
                data: { userId: user.id, workspaceId: workspace.id, role: 'Managing Partner', status: 'active' },
            });
            return { user, workspace };
        });

        const verificationToken = await createEmailVerificationToken(user.id, email);
        const verificationUrl = `${config.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${verificationToken}`;
        await mailService.send({
            to: email,
            subject: `Welcome to Reforma X`,
            html: getFirmOwnerWelcomeEmail(name, workspaceName, firmCode, verificationUrl),
        }).catch(err => console.error('[Reforma X signup] Welcome email failed:', err));

        await logSecurityEvent({
            userId: user.id,
            event: SecurityEvent.EMAIL_VERIFICATION_REQUEST,
            description: `Reforma X signup via SCN for ${email}`,
            metadata: { email, scn, workspaceId: workspace.id },
        });

        await signIn('credentials', { email, password, redirect: false });
        return { success: true };
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (error?.digest?.startsWith('NEXT_REDIRECT')) throw error;
        if (error instanceof AuthError) {
            return { message: 'Account created, but sign-in failed — try logging in.' };
        }
        if (error.code === 'P2002') {
            const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : error.meta?.target;
            if (target?.includes('scn')) return { message: 'That SCN is already registered to an account.' };
            return { message: 'An account with this email already exists.' };
        }
        console.error('[Reforma X signup] failed:', error);
        return { message: 'Something went wrong creating your account. Please try again.' };
    }
}

/** The onboarding question's answer — stored on the workspace since it shapes what the firm is offered, not one lawyer's personal preference. */
export async function setPracticeFocus(focus: PracticeFocus) {
    const session = await auth();
    if (!session?.user?.workspaceId) return { error: 'Not authenticated.' };
    if (!PRACTICE_FOCUS_VALUES.includes(focus)) return { error: 'Invalid selection.' };

    await prisma.workspace.update({
        where: { id: session.user.workspaceId },
        data: { practiceFocus: focus },
    });
    return { success: true };
}
