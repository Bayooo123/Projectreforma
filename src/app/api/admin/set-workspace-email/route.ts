import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePlatformAdminRoute } from '@/lib/admin-guard';

// POST /api/admin/set-workspace-email
// Body: { workspaceName: string, handle: string }
// Sets the institutional memory email address for a workspace.
// Example: { workspaceName: "ASCOLP", handle: "ascolp" } → ascolp@reforma.ng
export async function POST(req: NextRequest) {
    const guardResponse = await requirePlatformAdminRoute(req);
    if (guardResponse) return guardResponse;

    try {
        const { workspaceName, handle } = await req.json();

        if (!workspaceName || !handle) {
            return NextResponse.json({ error: 'workspaceName and handle are required' }, { status: 400 });
        }

        const clean = handle.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
        if (!clean || clean.length < 2 || clean.length > 30) {
            return NextResponse.json({ error: 'Handle must be 2–30 alphanumeric characters' }, { status: 400 });
        }

        const workspace = await prisma.workspace.findFirst({
            where: { name: { contains: workspaceName, mode: 'insensitive' } },
            select: { id: true, name: true },
        });

        if (!workspace) {
            return NextResponse.json({ error: `Workspace not found: ${workspaceName}` }, { status: 404 });
        }

        const emailAddress = `${clean}@reforma.ng`;

        const conflict = await prisma.workspaceEmailConfig.findFirst({
            where: { emailAddress },
        });
        if (conflict && conflict.workspaceId !== workspace.id) {
            return NextResponse.json({ error: `${emailAddress} is already assigned to another workspace` }, { status: 409 });
        }

        const config = await prisma.workspaceEmailConfig.upsert({
            where: { workspaceId: workspace.id },
            create: { workspaceId: workspace.id, emailAddress, isActive: true },
            update: { emailAddress, isActive: true },
        });

        return NextResponse.json({
            success: true,
            workspace: workspace.name,
            emailAddress: config.emailAddress,
        });
    } catch (error) {
        console.error('[Admin] set-workspace-email error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
