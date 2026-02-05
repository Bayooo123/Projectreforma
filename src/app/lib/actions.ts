'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { redirect } from 'next/navigation';
import { generateUniqueLawyerToken } from '@/lib/lawyer-tokens';

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
    const email = formData.get('email') as string;
    const firmName = formData.get('firmName') as string;

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

export async function registerMember(
    prevState: string | undefined,
    formData: FormData,
) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const phone = formData.get('phone') as string;
    const inviteToken = formData.get('inviteToken') as string;
    const role = 'Associate'; // Default role for magic link joins? Or allow select? Slack allows generic member. Let's say 'lawyer' or 'staff'. 'Associate' is safe.

    console.log('🔵 User Joining via Token:', { email, name });

    if (!name || !email || !password || !phone || !inviteToken) {
        return 'Please fill in all fields.';
    }

    // BLOCK MEMBER JOINS FOR NOW
    return 'Joins are currently restricted. Please contact your firm administrator.';

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
                // If user exists, just add them? 
                // But we requested a password. If they entered a different password, that's weird.
                // Assuming "Register" means new user.
                // If user exists, they should "Login".
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
                    status: 'active' // Magic link auto-activates?
                }
            });

            return { user, workspace };
        });

        // 4. Sign In (using the new auth logic that accepts inviteToken)
        // We need to pass inviteToken so authorize() skips firm checks
        // But wait, `signIn` calls `authorize`. 
        // My `auth.ts` `authorize` logic handles `inviteToken`.
        // So I pass `inviteToken` in the credentials object.

        await signIn('credentials', {
            email,
            password,
            inviteToken,
            redirectTo: '/briefs' // Go to brief manager
        });

    } catch (error: any) {
        console.error('Join error:', error);
        if (error instanceof Error) return error.message;
        return 'Failed to join workspace.';
    }
}
