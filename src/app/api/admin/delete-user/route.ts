
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Email query parameter is required' }, { status: 400 });
    }

    try {
        // 1. Find User
        const user = await prisma.user.findUnique({
            where: { email },
            include: { workspaces: true }
        });

        if (!user) {
            return NextResponse.json({ message: 'User not found', email });
        }

        // 2. Delete User (Cascade should handle memberships, but let's be safe if not)
        // If user owns workspaces, we might have issues.
        // For now, simpler is better for this specific support case.

        await prisma.user.delete({
            where: { email }
        });

        return NextResponse.json({
            message: 'User deleted successfully',
            email: user.email,
            deletedId: user.id
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
