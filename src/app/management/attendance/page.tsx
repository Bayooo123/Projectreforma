import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AttendanceClient from './AttendanceClient';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const member = await prisma.workspaceMember.findFirst({
        where: { userId: session.user.id, status: 'active' },
        select: { workspaceId: true, role: true },
    });

    const workspace = member ? await prisma.workspace.findUnique({
        where: { id: member.workspaceId },
        select: { ownerId: true },
    }) : null;

    const hasAccess = member && (
        ['admin', 'owner'].includes(member.role) || workspace?.ownerId === session.user.id
    );

    if (!hasAccess) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Access Denied</h2>
                <p style={{ color: '#64748b' }}>Only workspace admins can view attendance records.</p>
            </div>
        );
    }

    return <AttendanceClient workspaceId={member!.workspaceId} />;
}
