import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

// Admin endpoint to reset workspace join password
// Usage: POST /api/admin/reset-join-password
// Body: { workspaceName: "ASCOLP", newPassword: "mynewpassword" }
// If no newPassword provided, auto-generates one

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { workspaceName, newPassword } = body;

        if (!workspaceName) {
            return NextResponse.json({ error: 'workspaceName required' }, { status: 400 });
        }

        const workspace = await prisma.workspace.findFirst({
            where: {
                name: {
                    contains: workspaceName,
                    mode: 'insensitive'
                }
            }
        });

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
        }

        // Generate or use provided password
        const plainPassword = newPassword || nanoid(12);
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // Also generate invite link token if missing
        const inviteLinkToken = workspace.inviteLinkToken || nanoid(24);

        // Update workspace
        await prisma.workspace.update({
            where: { id: workspace.id },
            data: {
                joinPassword: hashedPassword,
                inviteLinkToken: inviteLinkToken
            }
        });

        return NextResponse.json({
            success: true,
            workspace: workspace.name,
            firmCode: workspace.firmCode,
            newJoinPassword: plainPassword,
            inviteLink: `/invite/${inviteLinkToken}`,
            message: 'Join password has been reset. Share the firmCode + newJoinPassword with team members, or use the inviteLink.'
        });

    } catch (error) {
        console.error('[Admin] Error:', error);
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }
}
