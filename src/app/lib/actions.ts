'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { redirect } from 'next/navigation';
import { generateUniqueLawyerToken } from '@/lib/lawyer-tokens';
import { createEmailVerificationToken } from '@/lib/services/auth/tokens';
import { mailService } from '@/lib/services/mail/mail';
import { getVerificationEmail } from '@/lib/services/mail/templates';
import { logSecurityEvent, SecurityEvent } from '@/lib/services/auth/audit';
import { headers } from 'next/headers';
import { checkRateLimit, getClientIp } from '@/lib/services/auth/ratelimit';
import { config } from '@/lib/config';

// Define AuthState type
export type AuthState = {
    message?: string;
    success?: boolean;
};

export async function authenticate(
    prevState: AuthState | undefined,
    formData: FormData,
): Promise<AuthState | undefined> {
    try {
        await signIn('credentials', {
            ...Object.fromEntries(formData),
            redirect: false, // Disable server-side redirect
        });

        // If signIn doesn't throw, it means success (with redirect: false)
        return { success: true };

    } catch (error) {
        if ((error as Error).message.includes('Pending Approval')) {
            return { message: 'Your account is pending firm approval. Please contact your administrator.' };
        }
        if (error instanceof AuthError) {
            // Check for our custom errors wrapped in AuthError
            if (error.cause?.err?.message) {
                return { message: error.cause.err.message };
            }
            // Or check the message directly if it propagates
            if (error.message.includes('Invalid Firm Code')) return { message: 'Invalid Firm Code.' };
            if (error.message.includes('Invalid Firm Password')) return { message: 'Invalid Firm Password.' };
            if (error.message.includes('not a member')) return { message: 'You are not a member of this firm.' };

            switch (error.type) {
                case 'CredentialsSignin':
                    return { message: 'Invalid email or password.' };
                case 'CallbackRouteError':
                    // Often where the thrown Error ends up
                    if (error.message.includes('Invalid Firm Code')) return { message: 'Invalid Firm Code.' };
                    if (error.message.includes('Invalid Firm Password')) return { message: 'Invalid Firm Password.' };
                    return { message: 'Authentication failed.' };
                default:
                    return { message: 'Something went wrong.' };
            }
        }
        throw error;
    }
}

export async function register(
    prevState: string | undefined,
    formData: FormData,
) {
    const name = formData.get('name') as string;
    const email = (formData.get('email') as string).toLowerCase();
    const firmName = formData.get('firmName') as string;
    const password = formData.get('password') as string;
    const phone = formData.get('phone') as string;
    const role = formData.get('role') as string;
    const isPilot = formData.get('isPilot') === 'true';

    // Rate Limiting: 5 attempts per 15 mins per IP
    const h = await headers();
    const ip = getClientIp(h);
    const rl = await checkRateLimit({
        key: `register:${ip}`,
        limit: 5,
        windowSeconds: 15 * 60,
    });

    if (!rl.success) {
        return 'Too many registration attempts. Please try again later.';
    }

    if (!isPilot) {
        // BLOCK NEW SIGNUPS (LOCKED FOR APRIL LAUNCH)
        console.log('🔒 Public registration is currently disabled. Adding to waitlist instead.');
        try {
            await prisma.waitlist.upsert({
                where: { email },
                update: { name, firmName },
                create: { email, name, firmName }
            });
            return 'Registration is currently limited. You have been added to our waitlist and we will notify you once your workspace is ready.';
        } catch (e) {
            console.error('Waitlist error during registration attempt:', e);
            return 'Registration is currently closed. Please join the waitlist on the home page.';
        }
    }

    // PILOT BYPASS LOGIC
    console.log('🚀 Pilot registration bypass triggered for:', { email, firmName });

    try {
        if (!name || !email || !password || !firmName || !phone) {
            return 'Please fill in all fields.';
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const lawyerToken = await generateUniqueLawyerToken();
        const firmCode = nanoid(6).toUpperCase();
        const inviteLinkToken = nanoid(12);
        // Generate a unique slug from firm name
        const slugBase = firmName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const slug = `${slugBase}-${nanoid(5).toLowerCase()}`;

        const { user } = await prisma.$transaction(async (tx) => {
            // 1. Create User
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    phone,
                    lawyerToken,
                }
            });

            // 2. Create Workspace
            const workspace = await tx.workspace.create({
                data: {
                    name: firmName,
                    slug,
                    firmCode,
                    inviteLinkToken,
                    ownerId: user.id,
                }
            });

            // 3. Add User as Workspace Admin Member
            await tx.workspaceMember.create({
                data: {
                    userId: user.id,
                    workspaceId: workspace.id,
                    role: role || 'Managing Partner',
                    status: 'active'
                }
            });

            return { user, workspace };
        });

        // 4. Generate Verification Token
        const verificationToken = await createEmailVerificationToken(user.id, email);
        const domain = config.NEXT_PUBLIC_APP_URL;
        const verificationUrl = `${domain}/api/auth/verify-email?token=${verificationToken}`;

        // 5. Send Verification Email
        await mailService.send({
            to: email,
            subject: 'Verify your Reforma account',
            html: getVerificationEmail(name, verificationUrl)
        });

        // 6. Log Security Event
        await logSecurityEvent({
            userId: user.id,
            event: SecurityEvent.EMAIL_VERIFICATION_REQUEST,
            description: `Verification email sent to ${email}`,
            metadata: { email }
        });

        return 'Registration successful! Please check your email to verify your account before logging in.';

    } catch (error: any) {
        // Re-throw Next.js redirect (NEXT_REDIRECT) — this is the successful path
        if (error?.digest?.startsWith('NEXT_REDIRECT')) throw error;

        // CRITICAL: Log full error details for debugging server-side exceptions
        console.error('❌ Pilot registration failure:', {
            error: error?.message || error,
            stack: error?.stack,
            digest: error?.digest,
            data: { email, firmName, name }
        });

        if (error.code === 'P2002') {
            return 'A user with this email already exists.';
        }
        return `Error: ${error.message || 'Failed to create pilot account. Please try again.'}`;
    }
}

export async function registerMember(
    prevState: string | undefined,
    formData: FormData,
) {
    const name = formData.get('name') as string;
    const email = (formData.get('email') as string).toLowerCase();
    const password = formData.get('password') as string;
    const phone = formData.get('phone') as string;
    const inviteToken = formData.get('inviteToken') as string;
    const role = 'Associate'; // Default role for magic link joins? Or allow select? Slack allows generic member. Let's say 'lawyer' or 'staff'. 'Associate' is safe.

    console.log('🔵 User Joining via Token:', { email, name });

    // Rate Limiting: 5 attempts per 15 mins per IP
    const h = await headers();
    const ip = getClientIp(h);
    const rl = await checkRateLimit({
        key: `register-member:${ip}`,
        limit: 5,
        windowSeconds: 15 * 60,
    });

    if (!rl.success) {
        return 'Too many joining attempts. Please try again later.';
    }

    if (!name || !email || !password || !phone || !inviteToken) {
        return 'Please fill in all fields.';
    }

    // UNBLOCKED MEMBER JOINS FOR PILOT FIRMS
    // return 'Joins are currently restricted. Please contact your firm administrator.';

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await prisma.$transaction(async (tx) => {
            // 1. Validate Token & Get Workspace
            const workspace = await tx.workspace.findUnique({
                where: { inviteLinkToken: inviteToken }
            });
            if (!workspace) throw new Error('Invalid or expired invite link.');

            // 2. Check/Create User
            let user = await tx.user.findUnique({ where: { email } });
            if (user) {
                throw new Error('User already exists. Please log in instead.');
            }

            // Generate Lawyer Token
            const lawyerToken = await generateUniqueLawyerToken();

            user = await tx.user.create({
                data: { name, email, password: hashedPassword, phone, lawyerToken }
            });

            // 3. Add to Workspace
            await tx.workspaceMember.create({
                data: {
                    userId: user.id,
                    workspaceId: workspace.id,
                    role: role,
                    status: 'active'
                }
            });

            return { user, workspace };
        });

        // 4. Generate Verification Token
        const vToken = await createEmailVerificationToken(result.user.id, result.user.email);
        const domain = config.NEXT_PUBLIC_APP_URL;
        const vUrl = `${domain}/api/auth/verify-email?token=${vToken}`;

        // 5. Send Verification Email
        await mailService.send({
            to: email,
            subject: 'Verify your Reforma account',
            html: getVerificationEmail(name, vUrl)
        });

        // 6. Log Security Event
        await logSecurityEvent({
            userId: result.user.id,
            event: SecurityEvent.EMAIL_VERIFICATION_REQUEST,
            description: `Verification email sent to ${email} (Member Join)`,
            metadata: { email, workspaceId: result.workspace.id }
        });

        return 'Account created! Please check your email to verify your account before logging in.';

    } catch (error: any) {
        console.error('Join error:', error);
        if (error instanceof Error) return error.message;
        return 'Failed to join workspace.';
    }
}
