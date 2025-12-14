'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export type Member = {
    id: string;
    userId: string;
    name: string | null;
    email: string;
    role: string;
    designation: string | null;
    status: string;
    joinedAt: Date;
};

export async function getWorkspaceMembers(workspaceId: string) {
    try {
        const members = await prisma.workspaceMember.findMany({
            where: { workspaceId },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                    }
                }
            },
            orderBy: {
                joinedAt: 'desc'
            }
        });

        return {
            success: true,
            data: members.map(m => ({
                id: m.id, // workspaceMember id
                userId: m.userId,
                name: m.user.name,
                email: m.user.email,
                role: m.role,
                // @ts-ignore
                designation: m.designation,
                // @ts-ignore
                status: m.status,
                joinedAt: m.joinedAt,
            }))
        };
    } catch (error) {
        console.error('Failed to fetch members:', error);
        return { success: false, error: 'Failed to fetch members' };
    }
}

export async function approveMember(memberId: string) {
    try {
        await prisma.workspaceMember.update({
            where: { id: memberId },
            // @ts-ignore
            data: { status: 'active' }
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Failed to approve member:', error);
        return { success: false, error: 'Failed to approve member' };
    }
}

export async function rejectMember(memberId: string) {
    try {
        // Delete the membership
        await prisma.workspaceMember.delete({
            where: { id: memberId },
        });

        // Optional: If user has no other workspaces and was just created, delete user?
        // For simplicity, we just remove them from the workspace.

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Failed to reject member:', error);
        return { success: false, error: 'Failed to reject member' };
    }
}
