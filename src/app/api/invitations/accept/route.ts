import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';
import bcrypt from 'bcryptjs';
import { validateInvitationToken, createEmailVerificationToken } from '@/lib/services/auth/tokens';
import { mailService } from '@/lib/services/mail/mail';
import { getVerificationEmail } from '@/lib/services/mail/templates';
import { logSecurityEvent, SecurityEvent } from '@/lib/services/auth/audit';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, name, password } = body;

        if (!token) {
            return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        }

        const invitation = await validateInvitationToken(token);

        if (!invitation) {
            return NextResponse.json({ error: 'Invalid, expired, or used invitation link' }, { status: 404 });
        }

        // Check if user already exists
        const user = await prisma.user.findUnique({
            where: { email: invitation.email.toLowerCase() },
        });

        if (user) {
            // Add to workspace if not already a member, then mark invitation accepted
            const existing = await prisma.workspaceMember.findUnique({
                where: { userId_workspaceId: { userId: user.id, workspaceId: invitation.workspaceId } },
            });

            if (!existing) {
                await prisma.workspaceMember.create({
                    data: { userId: user.id, workspaceId: invitation.workspaceId, role: invitation.role },
                });
            }

            await prisma.invitation.update({
                where: { id: invitation.id },
                data: { status: 'accepted', acceptedAt: new Date() },
            });

            await logSecurityEvent({
                userId: user.id,
                event: SecurityEvent.INVITATION_ACCEPTED,
                description: `Existing user accepted invitation to workspace ${invitation.workspaceId}`,
                req: request,
                metadata: { workspaceId: invitation.workspaceId },
            });

            return NextResponse.json({
                success: true,
                requiresLogin: true,
                email: user.email,
                message: 'You have been added to the workspace. Sign in to access it.',
            });
        }

        // New User Flow
        if (!name || !password) {
            return NextResponse.json({ error: 'Name and password are required for new accounts' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.$transaction(async (tx) => {
            const u = await tx.user.create({
                data: {
                    name,
                    email: invitation.email.toLowerCase(),
                    password: hashedPassword,
                },
            });

            await tx.workspaceMember.create({
                data: {
                    userId: u.id,
                    workspaceId: invitation.workspaceId,
                    role: invitation.role,
                },
            });

            await tx.invitation.update({
                where: { id: invitation.id },
                data: {
                    status: 'accepted',
                    acceptedAt: new Date(),
                },
            });

            return u;
        });

        // Verification Email
        const vToken = await createEmailVerificationToken(newUser.id, newUser.email);
        const domain = config.NEXT_PUBLIC_APP_URL;
        const vUrl = `${domain}/api/auth/verify-email?token=${vToken}`;

        await mailService.send({
            to: newUser.email,
            subject: 'Verify your Reforma account',
            html: getVerificationEmail(name, vUrl)
        });

        await logSecurityEvent({
            userId: newUser.id,
            event: SecurityEvent.INVITATION_ACCEPTED,
            description: `Invitation accepted and account created for ${newUser.email}`,
            req: request,
            metadata: { workspaceId: invitation.workspaceId }
        });

        return NextResponse.json({
            success: true,
            message: 'Account created and invitation accepted! Please check your email to verify.',
            isNewUser: true,
            email: newUser.email,
        });

    } catch (error) {
        console.error('[AcceptInvite] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
