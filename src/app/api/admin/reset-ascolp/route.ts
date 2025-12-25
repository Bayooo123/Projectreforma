
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const results = {
            deletedMembers: 0,
            deletedWorkspace: 0,
            deletedUsers: 0,
            details: [] as string[]
        };

        // 1. Find Workspace(s) matching ASCOLP
        const workspaces = await prisma.workspace.findMany({
            where: {
                name: { contains: 'ASCOLP', mode: 'insensitive' }
            }
        });

        results.details.push(`Found ${workspaces.length} workspaces to delete.`);

        for (const ws of workspaces) {
            // Delete Members
            const { count: memberCount } = await prisma.workspaceMember.deleteMany({
                where: { workspaceId: ws.id }
            });
            results.deletedMembers += memberCount;

            // Delete Workspace
            // Note: If there are other relations (like Clients, Matters), this might fail or cascade.
            // Assuming simplified schema for now or Cascade delete is on.
            // If strictly needed, we should checking for other relations.
            await prisma.workspace.delete({
                where: { id: ws.id }
            });
            results.deletedWorkspace++;
        }

        // 2. Find Users with 'ascolp' in email
        const { count: userCount } = await prisma.user.deleteMany({
            where: {
                email: { contains: 'ascolp', mode: 'insensitive' }
            }
        });
        results.deletedUsers = userCount;
        results.details.push(`Deleted ${userCount} users with 'ascolp' in email.`);

        return NextResponse.json({
            message: 'ASCOLP Reset Complete',
            results
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
