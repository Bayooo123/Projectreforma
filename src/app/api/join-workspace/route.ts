import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// API endpoint for joining a workspace via invite token
export async function POST(req: NextRequest) {
    try {
        const { token, name, email, phone, password } = await req.json();

        if (!token || !name || !email || !password) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        // Find workspace by invite token
        const workspace = await prisma.workspace.findUnique({
            where: { inviteLinkToken: token }
        });

        if (!workspace) {
            return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            // Check if already a member
            const existingMember = await prisma.workspaceMember.findFirst({
                where: {
                    userId: existingUser.id,
                    workspaceId: workspace.id
                }
            });

            if (existingMember) {
                return NextResponse.json({ error: 'You are already a member of this workspace' }, { status: 400 });
            }

            // Add existing user to workspace
            await prisma.workspaceMember.create({
                data: {
                    userId: existingUser.id,
                    workspaceId: workspace.id,
                    role: 'Associate',
                    status: 'active'
                }
            });

            return NextResponse.json({
                success: true,
                email: existingUser.email,
                message: 'Added to workspace. Please log in.'
            });
        }

        // Create new user
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                phone,
                password: hashedPassword
            }
        });

        // Add to workspace
        await prisma.workspaceMember.create({
            data: {
                userId: user.id,
                workspaceId: workspace.id,
                role: 'Associate',
                status: 'active'
            }
        });

        return NextResponse.json({
            success: true,
            email: user.email,
            message: 'Account created and added to workspace. Please log in.'
        });

    } catch (error) {
        console.error('[Join Workspace] Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to join workspace'
        }, { status: 500 });
    }
}
