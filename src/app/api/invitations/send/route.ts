import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isWorkspaceOwner } from '@/lib/workspace';
import { sendInvitationEmail } from '@/lib/email';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { workspaceId, emails, role } = body;

        // Validate inputs
        if (!workspaceId || !emails || !Array.isArray(emails) || emails.length === 0) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (!role || !['Partner', 'Lawyer', 'Staff'].includes(role)) {
            return NextResponse.json(
                { error: 'Invalid role' },
                { status: 400 }
            );
        }

        // Check if user is workspace owner
        const isOwner = await isWorkspaceOwner(session.user.id, workspaceId);
        if (!isOwner) {
            return NextResponse.json(
                { error: 'Only workspace owners can send invitations' },
                { status: 403 }
            );
        }

        // Get workspace details
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: {
                owner: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!workspace) {
            return NextResponse.json(
                { error: 'Workspace not found' },
                { status: 404 }
            );
        }

        const inviterName = workspace.owner.name || workspace.owner.email || 'A team member';
        const invitations = [];
        const errors = [];

        // Create invitations for each email
        for (const email of emails) {
            try {
                // Check if user already exists in workspace
                const existingMember = await prisma.workspaceMember.findFirst({
                    where: {
                        workspaceId,
                        user: {
                            email: email.toLowerCase(),
                        },
                    },
                });

                if (existingMember) {
                    errors.push({ email, error: 'User is already a member of this workspace' });
                    continue;
                }

                // Check for existing pending invitation
                const existingInvitation = await prisma.invitation.findFirst({
                    where: {
                        workspaceId,
                        email: email.toLowerCase(),
                        status: 'pending',
                        expiresAt: {
                            gt: new Date(),
                        },
                    },
                });

                if (existingInvitation) {
                    errors.push({ email, error: 'An invitation has already been sent to this email' });
                    continue;
                }

                // Create invitation
                const token = nanoid(32);
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

                const invitation = await prisma.invitation.create({
                    data: {
                        workspaceId,
                        email: email.toLowerCase(),
                        role,
                        token,
                        invitedBy: session.user.id,
                        expiresAt,
                    },
                });

                // Send invitation email
                const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`;

                await sendInvitationEmail({
                    to: email,
                    workspaceName: workspace.name,
                    inviterName,
                    inviteLink,
                    role,
                });

                invitations.push({ email, invitationId: invitation.id });
                console.log('✅ Invitation created and sent:', { email, token });

            } catch (error) {
                console.error('❌ Error processing invitation for:', email, error);
                errors.push({
                    email,
                    error: error instanceof Error ? error.message : 'Failed to send invitation'
                });
            }
        }

        return NextResponse.json({
            success: true,
            invitations,
            errors: errors.length > 0 ? errors : undefined,
        });

    } catch (error) {
        console.error('❌ Error in send invitation API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
