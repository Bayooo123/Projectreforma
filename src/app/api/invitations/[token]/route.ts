import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;

        const invitation = await prisma.invitation.findUnique({
            where: { token },
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
                { error: 'Invitation not found' },
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
        console.error('❌ Error fetching invitation:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
