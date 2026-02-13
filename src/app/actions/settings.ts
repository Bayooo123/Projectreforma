'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateWorkspaceSettings(
    workspaceId: string,
    data: { letterheadUrl?: string | null; firmCode?: string | null; joinPassword?: string | null; revenuePin?: string | null; litigationPin?: string | null }
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
            select: { id: true, name: true, firmCode: true, letterheadUrl: true, revenuePin: true, litigationPin: true }
        });
        return { success: true, workspace };
    } catch (error) {
        console.error('Error fetching workspace settings:', error);
        return { success: false, error: 'Failed to fetch settings' };
    }
}

export async function getStorageUsage(workspaceId: string) {
    try {
        // Calculate total storage from documents
        const documents = await prisma.document.findMany({
            where: {
                brief: {
                    workspaceId: workspaceId
                }
            },
            select: {
                size: true,
                type: true
            }
        });

        const totalDocumentSize = documents.reduce((sum, doc) => sum + doc.size, 0);
        const documentCount = documents.length;

        // Storage limits based on plan (in bytes)
        // For now, using a default 5GB limit - this can be made dynamic based on workspace.plan
        const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024; // 5GB

        // Calculate breakdown by type
        const breakdown: Record<string, { count: number; size: number }> = {};
        documents.forEach(doc => {
            const type = doc.type || 'unknown';
            if (!breakdown[type]) {
                breakdown[type] = { count: 0, size: 0 };
            }
            breakdown[type].count++;
            breakdown[type].size += doc.size;
        });

        // Format sizes for display
        const formatBytes = (bytes: number): string => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
        };

        const percentageUsed = (totalDocumentSize / STORAGE_LIMIT) * 100;

        return {
            success: true,
            data: {
                totalUsed: totalDocumentSize,
                totalUsedFormatted: formatBytes(totalDocumentSize),
                totalLimit: STORAGE_LIMIT,
                totalLimitFormatted: formatBytes(STORAGE_LIMIT),
                percentageUsed: Math.round(percentageUsed * 100) / 100,
                documentCount,
                breakdown: Object.entries(breakdown).map(([type, data]) => ({
                    type,
                    count: data.count,
                    size: data.size,
                    sizeFormatted: formatBytes(data.size)
                }))
            }
        };
    } catch (error) {
        console.error('Error fetching storage usage:', error);
        return { success: false, error: 'Failed to fetch storage usage' };
    }
}
