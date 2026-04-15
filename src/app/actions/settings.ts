'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

type WorkspaceSettingsUpdate = {
    firmCode?: string | null;
    joinPassword?: string;
    letterheadUrl?: string | null;
    brandColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    brandingCompleted?: boolean;
    litigationPin?: string | null;
};

function formatBytes(bytes: number): string {
    if (bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const idx = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, idx);
    return `${value.toFixed(idx === 0 ? 0 : 2)} ${units[idx]}`;
}

async function assertWorkspaceAccess(workspaceId: string) {
    const user = await requireAuth();

    const membership = await prisma.workspaceMember.findFirst({
        where: {
            workspaceId,
            user: { email: user.email! },
        },
        select: { id: true },
    });

    if (!membership) {
        throw new Error('Unauthorized: You are not a member of this workspace');
    }
}

export async function getWorkspaceSettings(workspaceId: string) {
    try {
        if (!workspaceId) {
            return { success: false, error: 'Workspace ID is required' };
        }

        await assertWorkspaceAccess(workspaceId);

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                id: true,
                name: true,
                firmCode: true,
                joinPassword: true,
                letterheadUrl: true,
                brandColor: true,
                secondaryColor: true,
                accentColor: true,
                brandingCompleted: true,
                litigationPin: true,
            },
        });

        if (!workspace) {
            return { success: false, error: 'Workspace not found' };
        }

        return {
            success: true,
            workspace: {
                ...workspace,
                joinPassword: undefined,
            },
        };
    } catch (error: any) {
        console.error('Failed to fetch workspace settings:', error);
        return { success: false, error: error?.message || 'Failed to fetch workspace settings' };
    }
}

export async function updateWorkspaceSettings(workspaceId: string, settings: WorkspaceSettingsUpdate) {
    try {
        if (!workspaceId) {
            return { success: false, error: 'Workspace ID is required' };
        }

        await assertWorkspaceAccess(workspaceId);

        const data: WorkspaceSettingsUpdate & { joinPassword?: string } = {};

        if (settings.firmCode !== undefined) data.firmCode = settings.firmCode;
        if (settings.letterheadUrl !== undefined) data.letterheadUrl = settings.letterheadUrl;
        if (settings.brandColor !== undefined) data.brandColor = settings.brandColor;
        if (settings.secondaryColor !== undefined) data.secondaryColor = settings.secondaryColor;
        if (settings.accentColor !== undefined) data.accentColor = settings.accentColor;
        if (settings.brandingCompleted !== undefined) data.brandingCompleted = settings.brandingCompleted;
        if (settings.litigationPin !== undefined) data.litigationPin = settings.litigationPin;

        if (settings.joinPassword) {
            data.joinPassword = await bcrypt.hash(settings.joinPassword, 10);
        }

        const workspace = await prisma.workspace.update({
            where: { id: workspaceId },
            data,
            select: {
                id: true,
                firmCode: true,
                letterheadUrl: true,
                brandColor: true,
                secondaryColor: true,
                accentColor: true,
                brandingCompleted: true,
                litigationPin: true,
            },
        });

        revalidatePath('/settings');
        revalidatePath('/management');

        return { success: true, workspace };
    } catch (error: any) {
        console.error('Failed to update workspace settings:', error);
        return { success: false, error: error?.message || 'Failed to update workspace settings' };
    }
}

export async function completeBranding(
    workspaceId: string,
    colors: { brandColor: string; secondaryColor: string; accentColor: string }
) {
    return updateWorkspaceSettings(workspaceId, {
        brandColor: colors.brandColor,
        secondaryColor: colors.secondaryColor,
        accentColor: colors.accentColor,
        brandingCompleted: true,
    });
}

export async function getStorageUsage(workspaceId: string) {
    try {
        if (!workspaceId) {
            return { success: false, error: 'Workspace ID is required' };
        }

        await assertWorkspaceAccess(workspaceId);

        const docs = await prisma.document.findMany({
            where: {
                brief: {
                    workspaceId,
                },
            },
            select: {
                size: true,
                type: true,
            },
        });

        const totalUsed = docs.reduce((sum, d) => sum + (d.size || 0), 0);
        // Current fixed workspace storage cap. Adjust when plans are introduced.
        const totalLimit = 5 * 1024 * 1024 * 1024;
        const percentageUsed = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0;

        const breakdownMap = new Map<string, { size: number; count: number }>();
        for (const doc of docs) {
            const key = (doc.type || 'unknown').toLowerCase();
            const current = breakdownMap.get(key) || { size: 0, count: 0 };
            current.size += doc.size || 0;
            current.count += 1;
            breakdownMap.set(key, current);
        }

        const breakdown = Array.from(breakdownMap.entries()).map(([type, value]) => ({
            type,
            size: value.size,
            count: value.count,
            sizeFormatted: formatBytes(value.size),
        }));

        return {
            success: true,
            data: {
                totalUsed,
                totalLimit,
                totalUsedFormatted: formatBytes(totalUsed),
                totalLimitFormatted: formatBytes(totalLimit),
                percentageUsed,
                documentCount: docs.length,
                breakdown,
            },
        };
    } catch (error: any) {
        console.error('Failed to fetch storage usage:', error);
        return { success: false, error: error?.message || 'Failed to fetch storage usage' };
    }
}