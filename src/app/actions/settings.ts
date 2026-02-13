'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { head } from '@vercel/blob';

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
        // Get workspace-specific documents from database
        const documents = await prisma.document.findMany({
            where: {
                brief: {
                    workspaceId: workspaceId
                }
            },
            select: {
                url: true,
                type: true,
                name: true
            }
        });

        // Get workspace letterhead if exists
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { letterheadUrl: true }
        });

        let totalBlobSize = 0;
        let blobCount = 0;
        const breakdown: Record<string, { count: number; size: number }> = {};

        // Fetch actual sizes from Vercel Blob for each document
        for (const doc of documents) {
            try {
                // Use head() to get actual blob metadata without downloading
                const blobInfo = await head(doc.url);
                const size = blobInfo.size;

                totalBlobSize += size;
                blobCount++;

                // Extract file extension
                const extension = doc.type || doc.name.split('.').pop()?.toLowerCase() || 'unknown';

                if (!breakdown[extension]) {
                    breakdown[extension] = { count: 0, size: 0 };
                }
                breakdown[extension].count++;
                breakdown[extension].size += size;
            } catch (error) {
                console.warn(`Failed to get size for blob: ${doc.url}`, error);
                // Skip this blob if we can't access it
            }
        }

        // Include letterhead in storage calculation
        if (workspace?.letterheadUrl) {
            try {
                const letterheadInfo = await head(workspace.letterheadUrl);
                totalBlobSize += letterheadInfo.size;
                blobCount++;

                const extension = 'letterhead';
                if (!breakdown[extension]) {
                    breakdown[extension] = { count: 0, size: 0 };
                }
                breakdown[extension].count++;
                breakdown[extension].size += letterheadInfo.size;
            } catch (error) {
                console.warn('Failed to get letterhead size', error);
            }
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
                breakdown: Object.entries(breakdown)
                    .map(([type, data]) => ({
                        type,
                        count: data.count,
                        size: data.size,
                        sizeFormatted: formatBytes(data.size)
                    }))
                    .sort((a, b) => b.size - a.size) // Sort by size descending
            }
        };
    } catch (error) {
        console.error('Error fetching storage usage:', error);
        return { success: false, error: 'Failed to fetch storage usage' };
    }
}

