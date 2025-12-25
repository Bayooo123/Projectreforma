
'use server';

import { prisma } from "@/lib/prisma";

export async function verifyInviteToken(token: string) {
    if (!token) return { error: 'Token is required' };

    try {
        const workspace = await prisma.workspace.findUnique({
            where: { inviteLinkToken: token },
            select: {
                id: true,
                name: true,
                firmCode: true,
                inviteLinkToken: true
            }
        });

        if (!workspace) {
            return { error: 'Invalid or expired invite link.' };
        }

        return { success: true, workspace };
    } catch (error) {
        console.error('Error validating token:', error);
        return { error: 'Failed to validate link.' };
    }
}
