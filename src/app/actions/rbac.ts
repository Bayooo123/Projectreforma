'use server';

import { prisma } from '@/lib/prisma';
import { verifyPin } from '@/lib/rbac';
import { auth } from '@/auth';
import { getRoleSeniority } from '@/lib/roles';

// Head of Chamber (index 5) and above may set the workspace PIN
const PIN_MANAGER_MIN_SENIORITY = 5;

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
            // If no PIN is configured, we allow access by default (optional PIN logic)
            return { success: true };
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

export async function updateAdminPin(workspaceId: string, pin: string): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' };
        }

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { ownerId: true }
        });

        const isOwner = workspace?.ownerId === session.user.id;

        if (!isOwner) {
            const membership = await prisma.workspaceMember.findFirst({
                where: { workspaceId, userId: session.user.id },
                select: { role: true }
            });
            const seniority = getRoleSeniority(membership?.role || '');
            if (seniority < PIN_MANAGER_MIN_SENIORITY) {
                return { success: false, error: 'Only Head of Chamber, Partner, or Managing Partner can set the PIN.' };
            }
        }

        // Basic validation: 4 digits
        if (!/^\d{4}$/.test(pin)) {
            return { success: false, error: 'PIN must be exactly 4 digits' };
        }

        const { hashPin } = await import('@/lib/rbac');
        const hashedPin = hashPin(pin);

        await prisma.workspace.update({
            where: { id: workspaceId },
            data: { adminCode: hashedPin }
        });

        return { success: true };
    } catch (error) {
        console.error('Error updating admin PIN:', error);
        return { success: false, error: 'Failed to update admin PIN' };
    }
}
export async function isWorkspacePinSet(workspaceId: string): Promise<boolean> {
    try {
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { adminCode: true }
        });
        return !!workspace?.adminCode;
    } catch (error) {
        console.error('Error checking if PIN is set:', error);
        return true; // Default to safe-side (require PIN) if check fails
    }
}
