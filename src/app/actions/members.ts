'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

export async function getWorkspaceMembers(workspaceId: string) {
    try {
        const members = await prisma.workspaceMember.findMany({
            where: { workspaceId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        jobTitle: true,
                    },
                },
            },
        });
        // Flatten structure for frontend
        const formattedMembers = members.map(m => ({
            ...m.user,
            id: m.id, // Use Member ID primarily for actions
            userId: m.userId,
            role: m.role,
            designation: m.designation,
            status: m.status,
            joinedAt: m.joinedAt
        }));

        return { success: true, data: formattedMembers };
    } catch (error) {
        console.error('Failed to fetch members:', error);
        return { success: false, error: 'Failed to fetch members' };
    }
}

export async function updateUserProfile(data: { jobTitle: string }) {
    const session = await auth();
    if (!session?.user?.email) return { success: false, error: 'Unauthorized' };

    try {
        const user = await prisma.user.update({
            where: { email: session.user.email },
            data: { jobTitle: data.jobTitle },
        });
        revalidatePath('/settings');
        return { success: true, user };
    } catch (error) {
        console.error('Failed to update profile:', error);
        return { success: false, error: 'Failed to update profile' };
    }
}

export async function getUserProfile() {
    const session = await auth();
    if (!session?.user?.email) return { success: false, error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, name: true, jobTitle: true, email: true }
        });
        return { success: true, user };
    } catch (error) {
        return { success: false, error: 'Failed to fetch profile' };
    }
}

export async function approveMember(memberId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const member = await prisma.workspaceMember.findUnique({
            where: { id: memberId },
        });

        if (!member) return { success: false, error: 'Member not found' };

        // Verify requester permission
        const requester = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: member.workspaceId,
                    userId: session.user.id
                }
            }
        });

        if (!requester || (requester.role !== 'owner' && requester.role !== 'partner')) {
            return { success: false, error: 'Permission denied' };
        }

        await prisma.workspaceMember.update({
            where: { id: memberId },
            data: { status: 'active' }
        });

        revalidatePath('/settings'); // Revalidate settings page
        return { success: true };
    } catch (error) {
        console.error('Failed to approve member:', error);
        return { success: false, error: 'Failed to approve member' };
    }
}

export async function rejectMember(memberId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const member = await prisma.workspaceMember.findUnique({
            where: { id: memberId },
        });

        if (!member) return { success: false, error: 'Member not found' };

        // Verify requester permission
        const requester = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: member.workspaceId,
                    userId: session.user.id
                }
            }
        });

        if (!requester || (requester.role !== 'owner' && requester.role !== 'partner')) {
            return { success: false, error: 'Permission denied' };
        }

        await prisma.workspaceMember.delete({
            where: { id: memberId }
        });

        revalidatePath('/settings');
        return { success: true };
    } catch (error) {
        console.error('Failed to reject member:', error);
        return { success: false, error: 'Failed to reject member' };
    }
}
