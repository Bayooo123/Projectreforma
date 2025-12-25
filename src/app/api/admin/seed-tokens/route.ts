
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

// Prevent caching
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Find all workspaces
        const workspaces = await prisma.workspace.findMany();
        const updates = [];

        for (const ws of workspaces) {
            if (!ws.inviteLinkToken) {
                const token = nanoid(16); // Generate 16-char token
                const updatePromise = prisma.workspace.update({
                    where: { id: ws.id },
                    data: { inviteLinkToken: token }
                }).then(updated => ({
                    name: updated.name,
                    token: updated.inviteLinkToken,
                    status: 'Generated'
                }));
                updates.push(updatePromise);
            } else {
                updates.push(Promise.resolve({
                    name: ws.name,
                    token: ws.inviteLinkToken,
                    status: 'Existing'
                }));
            }
        }

        const results = await Promise.all(updates);

        // Find ASCOLP specifically
        const ascolp = results.find(r => r.name.toUpperCase().includes('ASCOLP') || r.name.toUpperCase().includes('ABIOLA'));

        return NextResponse.json({
            message: 'Token check complete',
            ascolp_token: ascolp ? ascolp.token : 'NOT_FOUND',
            magic_link: ascolp ? `https://reforma.ng/join/${ascolp.token}` : null,
            details: results
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
