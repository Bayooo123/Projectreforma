'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const UpdateAccessSchema = z.object({
    workspaceId: z.string(),
    firmCode: z.string().min(3, 'Firm code must be at least 3 characters'),
    firmPassword: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
});

export type WorkspaceAccessState = {
    errors?: {
        firmCode?: string[];
        firmPassword?: string[];
        _form?: string[];
    };
    success?: boolean;
    message?: string;
};

export async function updateWorkspaceAccess(
    prevState: WorkspaceAccessState,
    formData: FormData
): Promise<WorkspaceAccessState> {
    const session = await auth();
    if (!session?.user?.id) {
        return {
            errors: {
                _form: ['Unauthorized'],
            },
        };
    }

    const validatedFields = UpdateAccessSchema.safeParse({
        workspaceId: formData.get('workspaceId'),
        firmCode: formData.get('firmCode'),
        firmPassword: formData.get('firmPassword'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { workspaceId, firmCode, firmPassword } = validatedFields.data;

    try {
        // Verify ownership
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { ownerId: true },
        });

        if (!workspace || workspace.ownerId !== session.user.id) {
            return {
                errors: {
                    _form: ['You do not have permission to update this workspace.'],
                },
            };
        }

        // Check if firm code is already taken by another workspace
        const existingCode = await prisma.workspace.findUnique({
            where: { firmCode },
        });

        if (existingCode && existingCode.id !== workspaceId) {
            return {
                errors: {
                    firmCode: ['This firm code is already in use.'],
                },
            };
        }

        const data: any = {
            firmCode,
        };

        if (firmPassword) {
            data.joinPassword = await bcrypt.hash(firmPassword, 10);
        }

        await prisma.workspace.update({
            where: { id: workspaceId },
            data,
        });

        revalidatePath('/management/office');

        return {
            success: true,
            message: 'Workspace access settings updated successfully.',
        };
    } catch (error) {
        console.error('Update access error:', error);
        return {
            errors: {
                _form: ['Failed to update access settings.'],
            },
        };
    }
}

/**
 * Register a new user and join an existing workspace using firmCode + firmPassword
 */
export async function registerWithFirmCode(data: {
    firmCode: string;
    firmPassword: string;
    name: string;
    email: string;
    password: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const { firmCode, firmPassword, name, email, password } = data;

        // Find workspace by firmCode
        const workspace = await prisma.workspace.findUnique({
            where: { firmCode },
        });

        if (!workspace) {
            return { success: false, error: 'Invalid firm code. Please check and try again.' };
        }

        if (!workspace.joinPassword) {
            return { success: false, error: 'This firm has not enabled public joining. Contact your admin.' };
        }

        // Verify firm password
        const passwordMatch = await bcrypt.compare(firmPassword, workspace.joinPassword);
        if (!passwordMatch) {
            return { success: false, error: 'Invalid firm password. Please check and try again.' };
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            // Check if already a member of this workspace
            const existingMembership = await prisma.workspaceMember.findFirst({
                where: {
                    userId: existingUser.id,
                    workspaceId: workspace.id,
                },
            });

            if (existingMembership) {
                return { success: false, error: 'You are already a member of this firm. Please sign in instead.' };
            }

            // Add existing user to workspace
            await prisma.workspaceMember.create({
                data: {
                    userId: existingUser.id,
                    workspaceId: workspace.id,
                    role: 'associate', // Default role for joiners
                },
            });

            return { success: true };
        }

        // Create new user
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        });

        // Add user to workspace
        await prisma.workspaceMember.create({
            data: {
                userId: newUser.id,
                workspaceId: workspace.id,
                role: 'associate', // Default role for joiners
            },
        });

        return { success: true };
    } catch (error: any) {
        console.error('Register with firm code error:', error);
        if (error.code === 'P2002') {
            return { success: false, error: 'An account with this email already exists.' };
        }
        return { success: false, error: 'Failed to join firm. Please try again.' };
    }
}
