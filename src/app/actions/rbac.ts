'use server';

import { prisma } from '@/lib/prisma';
import { verifyPin } from '@/lib/rbac';

export async function verifyWorkspacePin(workspaceId: string, pin: string): Promise<{ success: boolean; error?: string }> {
    try {
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { adminCode: true }
        });

        if (!workspace) {
            return { success: false, error: 'Workspace not found' };
        }

        if (!workspace.adminCode) {
            // Fallback if no code is set (should not happen after migration)
            return { success: false, error: 'Admin code not configured' };
        }

        const isValid = verifyPin(pin, workspace.adminCode);

        if (isValid) {
            return { success: true };
        } else {
            return { success: false, error: 'Invalid PIN' };
        }
    } catch (error) {
        console.error('Error verifying PIN:', error);
        return { success: false, error: 'Internal server error' };
    }
}
