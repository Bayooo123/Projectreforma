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
