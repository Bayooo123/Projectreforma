import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/services/auth/tokens';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;
        const tokenHash = hashToken(token);

        const invitation = await prisma.invitation.findFirst({
            where: { tokenHash },
            include: {
                workspace: {
                    select: {
                        name: true,
                    },
                },
                inviter: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!invitation) {
            return NextResponse.json(
                { error: 'Invalid or expired invitation link' },
                { status: 404 }
            );
        }

        if (invitation.expiresAt < new Date()) {
            return NextResponse.json(
                { error: 'This invitation has expired' },
                { status: 400 }
            );
        }

        if (invitation.status !== 'pending') {
            return NextResponse.json(
                { error: 'This invitation has already been used' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            workspace: invitation.workspace,
            email: invitation.email,
            role: invitation.role,
            inviter: invitation.inviter,
            expiresAt: invitation.expiresAt,
        });

    } catch (error) {
        console.error('[GetInvite] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
