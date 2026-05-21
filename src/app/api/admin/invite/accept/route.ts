import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashToken } from '@/lib/services/auth/tokens';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { token, name, password } = await request.json();
        if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 400 });

        const tokenHash = hashToken(token);
        const invite = await prisma.adminInvite.findFirst({
            where: { tokenHash, status: 'pending', expiresAt: { gt: new Date() } },
        });

        if (!invite) return NextResponse.json({ error: 'Invalid or expired invitation.' }, { status: 404 });

        const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });

        // ── Phase 1: token-only check (no name/password yet) ──────────────
        if (!name && !password) {
            if (existingUser) {
                // Account already exists — just grant admin flag and redirect to login
                await prisma.user.update({ where: { id: existingUser.id }, data: { isPlatformAdmin: true } });
                await prisma.adminInvite.update({ where: { id: invite.id }, data: { status: 'accepted', acceptedAt: new Date() } });
                return NextResponse.json({ success: true, requiresLogin: true, email: existingUser.email });
            }
            // New user — tell the client to show the signup form
            return NextResponse.json({ success: true, needsSignup: true, email: invite.email });
        }

        // ── Phase 2: create the new admin account ─────────────────────────
        if (!name || !password) return NextResponse.json({ error: 'Name and password are required.' }, { status: 400 });
        if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });

        const hashed = await bcrypt.hash(password, 10);

        await prisma.$transaction(async tx => {
            await tx.user.create({
                data: { name, email: invite.email, password: hashed, isPlatformAdmin: true },
            });
            await tx.adminInvite.update({
                where: { id: invite.id },
                data: { status: 'accepted', acceptedAt: new Date() },
            });
        });

        return NextResponse.json({ success: true, isNewUser: true, email: invite.email });

    } catch (error) {
        console.error('[AdminInviteAccept]', error);
        return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }
}
