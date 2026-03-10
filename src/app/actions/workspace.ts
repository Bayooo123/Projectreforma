'use server';

import { getCurrentUserWithWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * Server Action to get the current user with workspace details.
 * This safely wraps the lib function for use in Client Components.
 */
export async function getCurrentUserWithWorkspaceAction() {
  try {
    const data = await getCurrentUserWithWorkspace();
    return { success: true, data };
  } catch (error) {
    console.error('Action failed: getCurrentUserWithWorkspaceAction', error);
    return { success: false, error: 'Failed to fetch workspace data' };
  }
}

/**
 * Registers a user and joins them to a firm workspace using a firm code.
 */
export async function registerWithFirmCode(data: any) {
  const { firmCode, firmPassword, name, email, password } = data;

  try {
    // 1. Find the workspace
    const workspace = await prisma.workspace.findUnique({
      where: { firmCode },
    });

    if (!workspace || !workspace.joinPassword) {
      return { success: false, error: 'Invalid firm code.' };
    }

    // 2. Verify firm password
    const firmPasswordsMatch = await bcrypt.compare(firmPassword, workspace.joinPassword);
    if (!firmPasswordsMatch) {
      return { success: false, error: 'Invalid firm password.' };
    }

    // 3. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: 'Account with this email already exists.' };
    }

    // 4. Hash user password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Create user and association in transaction
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      });

      await tx.workspaceMember.create({
        data: {
          userId: newUser.id,
          workspaceId: workspace.id,
          role: 'staff',
          status: 'active',
        },
      });

      return newUser;
    });

    return { success: true, userId: result.id };
  } catch (error) {
    console.error('Registration failed:', error);
    return { success: false, error: 'Failed to create account. Please try again.' };
  }
}

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const WorkspaceAccessSchema = z.object({
    workspaceId: z.string().min(1, 'Workspace ID is required'),
    firmCode: z.string().min(1, 'Firm code is required').optional(),
    firmPassword: z.string().optional(),
});

export type WorkspaceAccessState = {
    errors?: {
        workspaceId?: string[];
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
    const validatedFields = WorkspaceAccessSchema.safeParse({
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
        const updateData: any = {};
        
        if (firmCode) {
            updateData.firmCode = firmCode;
        }

        if (firmPassword) {
            updateData.joinPassword = await bcrypt.hash(firmPassword, 10);
        }

        await prisma.workspace.update({
            where: { id: workspaceId },
            data: updateData,
        });

        revalidatePath('/dashboard/settings');
        
        return {
            success: true,
            message: 'Access credentials updated successfully',
        };
    } catch (error) {
        console.error('Failed to update workspace access:', error);
        return {
            errors: {
                _form: ['Failed to update credentials. Firm code might already be in use.'],
            },
        };
    }
}
