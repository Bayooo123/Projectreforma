'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { list } from '@vercel/blob';

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
        // Get actual storage usage from Vercel Blob
        let totalBlobSize = 0;
        let blobCount = 0;
        const breakdown: Record<string, { count: number; size: number }> = {};

        // List all blobs with pagination
        let cursor: string | undefined;
        let hasMore = true;

        while (hasMore) {
            const response = await list({
                cursor,
                limit: 1000 // Maximum allowed
            });

            // Process each blob
            response.blobs.forEach(blob => {
                totalBlobSize += blob.size;
                blobCount++;

                // Extract file extension from pathname
                const pathname = blob.pathname || '';
                const extension = pathname.split('.').pop()?.toLowerCase() || 'unknown';

                if (!breakdown[extension]) {
                    breakdown[extension] = { count: 0, size: 0 };
                }
                breakdown[extension].count++;
                breakdown[extension].size += blob.size;
            });

            hasMore = response.hasMore;
            cursor = response.cursor;
        }

        // Storage limits based on plan (in bytes)
        // For now, using a default 5GB limit - this can be made dynamic based on workspace.plan
        const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024; // 5GB

        // Format sizes for display
        const formatBytes = (bytes: number): string => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
        };

        const percentageUsed = (totalBlobSize / STORAGE_LIMIT) * 100;

        return {
            success: true,
            data: {
                totalUsed: totalBlobSize,
                totalUsedFormatted: formatBytes(totalBlobSize),
                totalLimit: STORAGE_LIMIT,
                totalLimitFormatted: formatBytes(STORAGE_LIMIT),
                percentageUsed: Math.round(percentageUsed * 100) / 100,
                documentCount: blobCount,
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

