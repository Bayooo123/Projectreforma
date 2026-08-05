'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth, requirePermission } from '@/lib/auth-utils';
import { logActivity } from '@/lib/log-activity';
import { createHash, randomBytes } from 'crypto';

const TOKEN_PREFIX = 'rf_ing_';
const DEFAULT_EXPIRY_DAYS = 14;

function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

/**
 * Create a new local-agent ingestion session for a workspace.
 * Returns the plaintext upload token exactly once — only the hash is stored.
 * The firm pastes this token into the local ingestion agent, which uses it to
 * authenticate uploads to /api/ingestion-agent/upload.
 */
export async function createIngestionSession(
    workspaceId: string,
    label: string | undefined,
    expiresInDays: number = DEFAULT_EXPIRY_DAYS
) {
    try {
        const user = await requireAuth();
        await requirePermission(workspaceId, 'MANAGE_OFFICE');

        const rawToken = randomBytes(32).toString('hex');
        const token = `${TOKEN_PREFIX}${rawToken}`;
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

        const session = await prisma.ingestionSession.create({
            data: {
                workspaceId,
                createdById: user.id!,
                label: label || null,
                tokenHash,
                expiresAt,
            },
        });

        logActivity({
            workspaceId,
            userId: user.id!,
            resource: 'INGESTION_SESSION',
            action: 'CREATED',
            resourceId: session.id,
            resourceName: label || undefined,
        }).catch(() => {});

        return {
            success: true,
            data: {
                id: session.id,
                token, // plaintext — only returned here, never again
                label: session.label,
                expiresAt: session.expiresAt,
                createdAt: session.createdAt,
            },
        };
    } catch (error) {
        console.error('Error creating ingestion session:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create ingestion session' };
    }
}

/**
 * List ingestion sessions for a workspace (never exposes tokenHash).
 */
export async function listIngestionSessions(workspaceId: string) {
    try {
        await requireAuth();
        await requirePermission(workspaceId, 'MANAGE_OFFICE');

        const sessions = await prisma.ingestionSession.findMany({
            where: { workspaceId },
            select: {
                id: true,
                label: true,
                status: true,
                expiresAt: true,
                lastUsedAt: true,
                createdAt: true,
                revokedAt: true,
                createdBy: { select: { name: true, email: true } },
                _count: { select: { candidates: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return { success: true, data: sessions };
    } catch (error) {
        console.error('Error listing ingestion sessions:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to list ingestion sessions' };
    }
}

/**
 * Revoke an ingestion session — the local agent can no longer upload with it.
 * Does not affect candidates already uploaded.
 */
export async function revokeIngestionSession(workspaceId: string, sessionId: string) {
    try {
        const user = await requireAuth();
        await requirePermission(workspaceId, 'MANAGE_OFFICE');

        const session = await prisma.ingestionSession.findFirst({
            where: { id: sessionId, workspaceId },
        });
        if (!session) return { success: false, error: 'Ingestion session not found' };

        await prisma.ingestionSession.update({
            where: { id: sessionId },
            data: { status: 'revoked', revokedAt: new Date() },
        });

        logActivity({
            workspaceId,
            userId: user.id!,
            resource: 'INGESTION_SESSION',
            action: 'REVOKED',
            resourceId: sessionId,
            resourceName: session.label || undefined,
        }).catch(() => {});

        return { success: true };
    } catch (error) {
        console.error('Error revoking ingestion session:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to revoke ingestion session' };
    }
}
