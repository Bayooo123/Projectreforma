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
    const password = formData.get('password') as string;
    const phone = formData.get('phone') as string;
    const firmName = formData.get('firmName') as string;
    const role = formData.get('role') as string;

    // Auto-generate firm code and join password for simplified onboarding
    const firmCode = firmName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) + '-' + nanoid(6);
    const firmPassword = nanoid(12);

    console.log('🔵 Registration attempt started for:', { email, name, firmName, role });

    // Validate required fields (simplified - no firmCode/firmPassword from user)
    if (!name || !email || !password || !phone || !firmName || !role) {
        console.log('❌ Validation failed: Missing required fields');
        return 'Please fill in all fields.';
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        console.log('❌ Validation failed: Invalid email format');
        return 'Please enter a valid email address.';
    }

    // Validate password strength
    if (password.length < 8) {
        console.log('❌ Validation failed: Password too short');
        return 'Password must be at least 8 characters long.';
    }

    // Validate admin roles
    const ADMIN_ROLES = [
        'Practice Manager',
        'Head of Chambers',
        'Deputy Head of Chambers',
        'Managing Partner',
        'Senior Associate',
        'Associate',
        'Managing Associate',
    ];

    if (!ADMIN_ROLES.includes(role)) {
        console.log('❌ Validation failed: Invalid role');
        return 'Invalid role selected.';
    }

    try {
        console.log('🔐 Hashing password...');
        // 1. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('✅ Password hashed successfully');

        // 2. Create User, Workspace, and Membership in a transaction
        console.log('🔄 Starting database transaction...');
        const result = await prisma.$transaction(async (tx) => {
            // Check if user exists
            console.log('🔍 Checking for existing user...');
            const existingUser = await tx.user.findUnique({ where: { email } });
            if (existingUser) {
                console.log('❌ User already exists:', existingUser.id);
                throw new Error('User already exists.');
            }
            console.log('✅ No existing user found');

            // Generate Lawyer Token
            const lawyerToken = await generateUniqueLawyerToken();

            // Create User
            console.log('👤 Creating user...');
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    phone,
                    lawyerToken,
                },
            });
            console.log('✅ User created successfully:', { id: user.id, email: user.email });

            // Check if firm code exists
            const existingFirm = await tx.workspace.findUnique({ where: { firmCode } });
            if (existingFirm) {
                throw new Error('Firm code is already taken.');
            }

            // Hash Firm Password
            const hashedFirmPassword = await bcrypt.hash(firmPassword, 10);

            // Create Workspace (Firm)
            console.log('🏢 Creating workspace...');
            const slug = firmName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + nanoid(6);
            const workspace = await tx.workspace.create({
                data: {
                    name: firmName,
                    slug,
                    ownerId: user.id,
                    firmCode,
                    joinPassword: hashedFirmPassword
                },
            });
            console.log('✅ Workspace created successfully:', { id: workspace.id, slug: workspace.slug });

            // Create Membership with specified role
            console.log('👥 Creating workspace membership...');
            const membership = await tx.workspaceMember.create({
                data: {
                    userId: user.id,
                    workspaceId: workspace.id,
                    role: role,
                },
            });
            console.log('✅ Membership created successfully:', { id: membership.id, role: membership.role });

            return { user, workspace, membership };
        });

        console.log('✅ Transaction completed successfully');
        console.log('📊 Registration summary:', {
            userId: result.user.id,
            workspaceId: result.workspace.id,
            membershipId: result.membership.id,
        });

        // Verify the user was actually created
        console.log('🔍 Verifying user in database...');
        const verifyUser = await prisma.user.findUnique({
            where: { email },
            include: {
                ownedWorkspaces: true,
                workspaces: true,
            },
        });

        if (verifyUser) {
            console.log('✅ User verification successful:', {
                id: verifyUser.id,
                email: verifyUser.email,
                ownedWorkspaces: verifyUser.ownedWorkspaces.length,
                workspaceMemberships: verifyUser.workspaces.length,
            });
        } else {
            console.error('❌ CRITICAL: User not found after creation!');
        }

        // 3. Sign in the user and redirect to onboarding
        console.log('🔑 Attempting to sign in user...');
        await signIn('credentials', {
            ...Object.fromEntries(formData),
            redirectTo: '/onboarding',
        });

    } catch (error) {
        console.error('❌ Registration error:', error);

        if (error instanceof Error) {
            console.error('Error details:', {
                message: error.message,
                name: error.name,
                stack: error.stack,
            });

            // Handle specific error types
            if (error.message.includes('User already exists')) {
                return 'An account with this email already exists.';
            }
            if (error.message.includes('NEXT_REDIRECT')) {
                // This is expected - NextAuth throws this for redirects
                console.log('✅ Redirect initiated successfully');
                throw error;
            }
            return error.message;
        }

        return 'Failed to create account. Please try again.';
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

    } catch (error) {
        console.error('Join error:', error);
        if (error instanceof Error) return error.message;
        return 'Failed to join workspace.';
    }
}
