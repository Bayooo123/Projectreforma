
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { createInvitationToken } from '@/lib/services/auth/tokens';
import { mailService } from '@/lib/services/mail/mail';
import { getWorkspaceInviteEmail } from '@/lib/services/mail/templates';
import { logSecurityEvent, SecurityEvent } from '@/lib/services/auth/audit';
import { checkRateLimit, getClientIp } from '@/lib/services/auth/ratelimit';
import { config } from '@/lib/config';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { email, role, workspaceId } = await req.json();

        if (!email || !role || !workspaceId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Rate Limiting: 5 attempts per 15 minutes per IP
        const ip = getClientIp(req.headers);
        const rl = await checkRateLimit({
            key: `workspace-invite:${ip}`,
            limit: 5,
            windowSeconds: 15 * 60,
        });

        if (!rl.success) {
            return NextResponse.json({ error: 'Too many invite attempts. Please try again later.' }, { status: 429 });
        }

        // Check if requester has permission to manage users
        try {
            const { requirePermission } = await import('@/lib/auth-utils');
            await requirePermission(workspaceId, 'MANAGE_USERS');
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId }
        });

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
        }

        // Generate Token and Create Invitation
        const { token } = await createInvitationToken(workspaceId, email.toLowerCase(), role, session.user.id);

        const domain = config.NEXT_PUBLIC_APP_URL;
        const inviteUrl = `${domain}/invite/${token}`;

        // Send Email
        await mailService.send({
            to: email,
            subject: `Invite to join ${workspace.name}`,
            html: getWorkspaceInviteEmail(workspace.name, session.user.name || 'Your admin', role, inviteUrl)
        });

        // Log security event
        await logSecurityEvent({
            userId: session.user.id,
            event: SecurityEvent.INVITATION_CREATED,
            description: `Invitation sent to ${email} for workspace ${workspace.name}`,
            req,
            metadata: { invitedEmail: email, workspaceId, role }
        });

        return NextResponse.json({ message: 'Invitation sent successfully' });
    } catch (error) {
        console.error('[InviteWorkspace] Error:', error);
        return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
    }
}
