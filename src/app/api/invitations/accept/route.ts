import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signIn } from '@/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, name, password } = body;

        // Validate inputs
        if (!token || !name || !password) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters long' },
                { status: 400 }
            );
        }

        // Find invitation
        const invitation = await prisma.invitation.findUnique({
            where: { token },
            include: {
                workspace: true,
            },
        });

        if (!invitation) {
            return NextResponse.json(
                { error: 'Invalid invitation link' },
                { status: 404 }
            );
        }

        // Check if invitation is expired
        if (invitation.expiresAt < new Date()) {
            return NextResponse.json(
                { error: 'This invitation has expired' },
                { status: 400 }
            );
        }

        // Check if invitation is already accepted
        if (invitation.status !== 'pending') {
            return NextResponse.json(
                { error: 'This invitation has already been used' },
                { status: 400 }
            );
        }

        // Check if user already exists
        let user = await prisma.user.findUnique({
            where: { email: invitation.email },
        });

        let isNewUser = false;

        if (!user) {
            // Create new user
            isNewUser = true;
            const hashedPassword = await bcrypt.hash(password, 10);

            user = await prisma.user.create({
                data: {
                    name,
                    email: invitation.email,
                    password: hashedPassword,
                },
            });

            console.log('✅ New user created:', { id: user.id, email: user.email });
        } else {
            console.log('ℹ️ Existing user found:', { id: user.id, email: user.email });
        }

        // Check if user is already a member
        const existingMembership = await prisma.workspaceMember.findFirst({
            where: {
                userId: user.id,
                workspaceId: invitation.workspaceId,
            },
        });

        if (existingMembership) {
            // Update invitation status
            await prisma.invitation.update({
                where: { id: invitation.id },
                data: {
                    status: 'accepted',
                    acceptedAt: new Date(),
                },
            });

            return NextResponse.json({
                success: true,
                message: 'You are already a member of this workspace',
                workspaceSlug: invitation.workspace.slug,
                isNewUser: false,
            });
        }

        // Add user to workspace
        await prisma.workspaceMember.create({
            data: {
                userId: user.id,
                workspaceId: invitation.workspaceId,
                role: invitation.role,
            },
        });

        console.log('✅ User added to workspace:', {
            userId: user.id,
            workspaceId: invitation.workspaceId,
            role: invitation.role,
        });

        // Update invitation status
        await prisma.invitation.update({
            where: { id: invitation.id },
            data: {
                status: 'accepted',
                acceptedAt: new Date(),
            },
        });

        console.log('✅ Invitation accepted:', { invitationId: invitation.id });

        return NextResponse.json({
            success: true,
            message: 'Successfully joined workspace',
            workspaceSlug: invitation.workspace.slug,
            isNewUser,
            email: user.email,
        });

    } catch (error) {
        console.error('❌ Error in accept invitation API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
