import { prisma } from './prisma';
import { auth } from '@/auth';

/**
 * Get the current user's workspace memberships with workspace details
 */
export async function getUserWorkspaces(userId: string) {
    return await prisma.workspaceMember.findMany({
        where: { userId },
        include: {
            workspace: true,
        },
        orderBy: {
            joinedAt: 'desc',
        },
    });
}

/**
 * Check if a user is the owner of a specific workspace
 */
export async function isWorkspaceOwner(userId: string, workspaceId: string): Promise<boolean> {
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { ownerId: true },
    });

    return workspace?.ownerId === userId;
}

/**
 * Get the user's primary workspace (first owned workspace or first joined workspace)
 */
export async function getPrimaryWorkspace(userId: string) {
    try {
        // Get all workspace memberships for the user
        const memberships = await prisma.workspaceMember.findMany({
            where: { userId, status: 'active' }, // Only active workspaces
            include: {
                workspace: {
                    include: {
                        _count: {
                            select: {
                                briefs: { where: { deletedAt: null } },
                                matters: true
                            }
                        }
                    }
                }
            }
        });

        if (memberships.length === 0) {
            // Check if they own any workspaces even if not explicitly a member (fallback)
            const owned = await prisma.workspace.findFirst({
                where: { ownerId: userId },
                include: {
                    _count: {
                        select: {
                            briefs: { where: { deletedAt: null } },
                            matters: true
                        }
                    }
                }
            });

            if (owned) {
                return {
                    ...owned,
                    role: 'owner',
                    isOwner: true,
                };
            }
            return null;
        }

        // Sort by activity: Sum of active briefs and matters
        const sorted = memberships.sort((a, b) => {
            const scoreA = (a.workspace._count.briefs || 0) + (a.workspace._count.matters || 0);
            const scoreB = (b.workspace._count.briefs || 0) + (b.workspace._count.matters || 0);

            // 1. Highest Activity wins
            if (scoreA !== scoreB) {
                return scoreB - scoreA;
            }

            // 2. Score Tie: Prefer owned workspaces
            if (a.workspace.ownerId === userId && b.workspace.ownerId !== userId) return -1;
            if (b.workspace.ownerId === userId && a.workspace.ownerId !== userId) return 1;

            // 3. Score & Ownership Tie: Prefer oldest membership (deterministic)
            return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
        });

        const primary = sorted[0];

        return {
            ...primary.workspace,
            role: primary.role,
            isOwner: primary.workspace.ownerId === userId,
        };
    } catch (error) {
        console.error('Failed to get primary workspace:', error);
        return null;
    }
}

/**
 * Get workspace details with member count
 */
export async function getWorkspaceDetails(workspaceId: string) {
    return await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
            owner: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                        },
                    },
                },
            },
            _count: {
                select: {
                    members: true,
                    matters: true,
                    clients: true,
                },
            },
        },
    });
}

/**
 * Get current authenticated user with workspace info
 */
export async function getCurrentUserWithWorkspace() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return null;
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
            },
        });

        if (!user) {
            return null;
        }

        const workspace = await getPrimaryWorkspace(user.id);

        return {
            user,
            workspace,
        };
    } catch (error) {
        console.error('Failed to get current user with workspace:', error);
        return null;
    }
}
