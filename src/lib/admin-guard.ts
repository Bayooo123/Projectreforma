/**
 * admin-guard.ts
 * 
 * Server-side guard enforcing that the caller is a platform administrator.
 * Import and call `requirePlatformAdminRoute` at the top of every /api/admin/* handler.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * Returns a NextResponse error if the caller is not a platform admin.
 * Returns `null` if the caller IS a platform admin (i.e., request may proceed).
 */
export async function requirePlatformAdminRoute(
    req: NextRequest
): Promise<NextResponse | null> {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json(
            { error: 'Unauthorized: Authentication required.' },
            { status: 401 }
        );
    }

    // Double-check against DB (don't trust JWT alone for admin gate)
    const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isPlatformAdmin: true },
    });

    if (!dbUser?.isPlatformAdmin) {
        return NextResponse.json(
            { error: 'Forbidden: Platform administrator access required.' },
            { status: 403 }
        );
    }

    return null; // Authorized
}
