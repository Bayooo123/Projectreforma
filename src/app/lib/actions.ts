'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { redirect } from 'next/navigation';

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if ((error as Error).message.includes('Pending Approval')) {
            return 'Your account is pending firm approval. Please contact your administrator.';
        }
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
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

    console.log('🔵 Registration attempt started for:', { email, name, firmName, role });

    // Validate required fields
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
        'Managing Associate',
    ];

    if (!ADMIN_ROLES.includes(role)) {
        console.log('❌ Validation failed: Invalid role');
        return 'Invalid role. Only senior management can create a firm workspace.';
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

            // Create User
            console.log('👤 Creating user...');
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    phone,
                },
            });
            console.log('✅ User created successfully:', { id: user.id, email: user.email });

            // Create Workspace (Firm)
            console.log('🏢 Creating workspace...');
            const slug = firmName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + nanoid(6);
            const workspace = await tx.workspace.create({
                data: {
                    name: firmName,
                    slug,
                    ownerId: user.id,
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
