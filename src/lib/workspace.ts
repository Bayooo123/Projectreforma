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
    // First, try to get an owned workspace
    const ownedWorkspace = await prisma.workspace.findFirst({
        where: { ownerId: userId },
        include: {
            members: {
                where: { userId },
                select: { role: true },
            },
        },
    });

    if (ownedWorkspace) {
        return {
            ...ownedWorkspace,
            role: ownedWorkspace.members[0]?.role || 'owner',
            isOwner: true,
        };
    }

    // If no owned workspace, get the first workspace they're a member of
    const membership = await prisma.workspaceMember.findFirst({
        where: { userId },
        include: {
            workspace: true,
        },
        orderBy: {
            joinedAt: 'desc',
        },
    });

    if (membership) {
        return {
            ...membership.workspace,
            role: membership.role,
            isOwner: false,
        };
    }

    return null;
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
}
