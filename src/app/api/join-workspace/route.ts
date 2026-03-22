import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

const schema = z.object({
    token: z.string().min(1, 'Invite token is required'),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('A valid email is required'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

// API endpoint for joining a workspace via invite token
export async function POST(req: NextRequest) {
    // Rate limit: 10 requests per hour per IP
    const ip = getClientIp(req);
    const limited = await checkRateLimit(`join-workspace:${ip}`, 10, 60 * 60 * 1000);
    if (limited) {
        return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    try {
        const body = await req.json();
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
        }
        const { token, name, email, phone, password } = parsed.data;

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
