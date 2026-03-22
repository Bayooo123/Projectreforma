import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePlatformAdminRoute } from '@/lib/admin-guard';

export async function GET(req: NextRequest) {
    const guardResponse = await requirePlatformAdminRoute(req);
    if (guardResponse) return guardResponse;

    const name = req.nextUrl.searchParams.get('name');

    if (!name) {
        return NextResponse.json({ error: 'Workspace name required' }, { status: 400 });
    }

    try {
        const workspace = await prisma.workspace.findFirst({
            where: {
                name: {
                    contains: name,
                    mode: 'insensitive'
                }
            },
            select: {
                id: true,
                name: true,
                slug: true,
                firmCode: true,
                joinPassword: true, // This is hashed, but shown for reference
                inviteLinkToken: true,
                createdAt: true,
                owner: {
                    select: {
                        name: true,
                        email: true
                    }
                },
                _count: {
                    select: {
                        members: true
                    }
                }
            }
        });

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
        }

        return NextResponse.json({
            workspace: {
                ...workspace,
                inviteLink: workspace.inviteLinkToken
                    ? `${req.nextUrl.origin}/invite/${workspace.inviteLinkToken}`
                    : 'No invite link generated'
            }
        });

    } catch (error) {
        console.error('[Admin] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch workspace' }, { status: 500 });
    }
}
