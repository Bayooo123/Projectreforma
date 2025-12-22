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
        return { success: true, members: members.map(m => m.user) };
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
