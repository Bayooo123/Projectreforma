'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', formData);
    } catch (error) {
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
    const firmName = formData.get('firmName') as string;

    if (!name || !email || !password || !firmName) {
        return 'Please fill in all fields.';
    }

    try {
        // 1. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. Create User, Workspace, and Membership in a transaction
        await prisma.$transaction(async (tx) => {
            // Check if user exists
            const existingUser = await tx.user.findUnique({ where: { email } });
            if (existingUser) {
                throw new Error('User already exists.');
            }

            // Create User
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                },
            });

            // Create Workspace (Firm)
            const slug = firmName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + nanoid(6);
            const workspace = await tx.workspace.create({
                data: {
                    name: firmName,
                    slug,
                    ownerId: user.id,
                },
            });

            // Create Membership (Owner)
            await tx.workspaceMember.create({
                data: {
                    userId: user.id,
                    workspaceId: workspace.id,
                    role: 'owner',
                },
            });
        });

        // 3. Sign in the user
        await signIn('credentials', formData);

    } catch (error) {
        if (error instanceof Error) {
            return error.message;
        }
        return 'Failed to create account.';
    }
}
