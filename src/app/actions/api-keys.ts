'use server';

import { prisma } from '@/lib/prisma';
import { createHash, randomBytes } from 'crypto';

/**
 * Generate a new API key for a user
 * Returns the plaintext key (only shown once) and the key record
 */
export async function generateApiKey(
    userId: string,
    workspaceId: string,
    name: string,
    expiresInDays?: number
) {
    try {
        // Generate a random 32-byte key
        const rawKey = randomBytes(32).toString('hex');
        const fullKey = `rf_sk_${rawKey}`;

        // Hash the key for storage
        const keyHash = createHash('sha256').update(fullKey).digest('hex');

        // Get the prefix for identification
        const keyPrefix = fullKey.substring(0, 10);

        // Calculate expiration
        const expiresAt = expiresInDays
            ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
            : null;

        // Create the API key record
        const apiKey = await prisma.apiKey.create({
            data: {
                userId,
                workspaceId,
                name,
                keyHash,
                keyPrefix,
                expiresAt,
            },
        });

        return {
            success: true,
            data: {
                id: apiKey.id,
                name: apiKey.name,
                key: fullKey, // Only returned once!
                keyPrefix: apiKey.keyPrefix,
                expiresAt: apiKey.expiresAt,
                createdAt: apiKey.createdAt,
            },
        };
    } catch (error) {
        console.error('Error generating API key:', error);
        return { success: false, error: 'Failed to generate API key' };
    }
}

/**
 * Validate an API key and return the user context
 */
export async function validateApiKey(key: string) {
    try {
        if (!key || !key.startsWith('rf_sk_')) {
            return { success: false, error: 'Invalid API key format' };
        }

        // Hash the provided key
        const keyHash = createHash('sha256').update(key).digest('hex');

        // Find the API key record
        const apiKey = await prisma.apiKey.findUnique({
            where: { keyHash },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!apiKey) {
            return { success: false, error: 'API key not found' };
        }

        // Check if revoked
        if (apiKey.revokedAt) {
            return { success: false, error: 'API key has been revoked' };
        }

        // Check if expired
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
            return { success: false, error: 'API key has expired' };
        }

        // Update last used timestamp
        await prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() },
        });

        // Get the user's workspace membership
        const membership = await prisma.workspaceMember.findFirst({
            where: {
                userId: apiKey.userId,
                workspaceId: apiKey.workspaceId,
            },
            include: {
                workspace: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
        });

        if (!membership) {
            return { success: false, error: 'User is not a member of the workspace' };
        }

        return {
            success: true,
            data: {
                userId: apiKey.user.id,
                userName: apiKey.user.name,
                userEmail: apiKey.user.email,
                workspaceId: apiKey.workspaceId,
                workspaceName: membership.workspace.name,
                workspaceSlug: membership.workspace.slug,
                role: membership.role,
                apiKeyId: apiKey.id,
                apiKeyName: apiKey.name,
            },
        };
    } catch (error) {
        console.error('Error validating API key:', error);
        return { success: false, error: 'Failed to validate API key' };
    }
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(apiKeyId: string, userId: string) {
    try {
        const apiKey = await prisma.apiKey.findFirst({
            where: {
                id: apiKeyId,
                userId,
            },
        });

        if (!apiKey) {
            return { success: false, error: 'API key not found' };
        }

        await prisma.apiKey.update({
            where: { id: apiKeyId },
            data: { revokedAt: new Date() },
        });

        return { success: true };
    } catch (error) {
        console.error('Error revoking API key:', error);
        return { success: false, error: 'Failed to revoke API key' };
    }
}

/**
 * List API keys for a user
 */
export async function listApiKeys(userId: string) {
    try {
        const apiKeys = await prisma.apiKey.findMany({
            where: {
                userId,
                revokedAt: null,
            },
            select: {
                id: true,
                name: true,
                keyPrefix: true,
                workspaceId: true,
                lastUsedAt: true,
                expiresAt: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return { success: true, data: apiKeys };
    } catch (error) {
        console.error('Error listing API keys:', error);
        return { success: false, error: 'Failed to list API keys' };
    }
}
