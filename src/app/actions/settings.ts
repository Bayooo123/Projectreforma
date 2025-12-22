'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateWorkspaceSettings(
    workspaceId: string,
    data: { letterheadUrl?: string | null; firmCode?: string | null; joinPassword?: string | null; revenuePin?: string | null }
) {
    try {
        const workspace = await prisma.workspace.update({
            where: { id: workspaceId },
            data: {
                ...data,
            },
        });

        revalidatePath('/management/office');
        return { success: true, workspace };
    } catch (error) {
        console.error('Error updating workspace settings:', error);
        return { success: false, error: 'Failed to update settings' };
    }
}

export async function getWorkspaceSettings(workspaceId: string) {
    try {
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { id: true, name: true, firmCode: true, letterheadUrl: true, revenuePin: true }
        });
        return { success: true, workspace };
    } catch (error) {
        console.error('Error fetching workspace settings:', error);
        return { success: false, error: 'Failed to fetch settings' };
    }
}
