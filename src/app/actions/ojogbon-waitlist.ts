'use server';

import { z } from 'zod';

const ROLES = ['student', 'postgraduate', 'supervisor', 'institution'] as const;

const PilotSchema = z.object({
    email: z.string().email('Enter a valid email address'),
    name: z.string().trim().min(2, 'Enter your name'),
    role: z.enum(ROLES, { message: 'Choose what describes you best' }),
    institution: z.string().trim().min(2, 'Enter your university or institution'),
});

export type PilotResult =
    | { success: true; message: string }
    | { success?: false; error: Partial<Record<'email' | 'name' | 'role' | 'institution', string[]>> };

/**
 * Ojogbon pilot sign-ups share the Waitlist table with Reforma.
 * They are tagged with market = "ojogbon:<role>" so they can be filtered apart,
 * and an existing Reforma waitlist entry is never overwritten.
 */
export async function joinOjogbonPilot(formData: FormData): Promise<PilotResult> {
    const parsed = PilotSchema.safeParse({
        email: String(formData.get('email') ?? '').trim().toLowerCase(),
        name: String(formData.get('name') ?? ''),
        role: String(formData.get('role') ?? ''),
        institution: String(formData.get('institution') ?? ''),
    });

    if (!parsed.success) {
        return { error: parsed.error.flatten().fieldErrors };
    }

    const { email, name, role, institution } = parsed.data;

    try {
        const { prisma } = await import('@/lib/prisma');
        const existing = await prisma.waitlist.findUnique({ where: { email } });

        if (!existing) {
            await prisma.waitlist.create({
                data: { email, name, firmName: institution, market: `ojogbon:${role}` },
            });
        } else if (!existing.market?.startsWith('ojogbon')) {
            // Already on the Reforma waitlist: keep that record intact.
            console.info('Ojogbon pilot sign-up from existing Reforma waitlist email', { email, role });
        } else {
            await prisma.waitlist.update({
                where: { email },
                data: { name, firmName: institution, market: `ojogbon:${role}` },
            });
        }

        return {
            success: true,
            message: 'You’re on the pilot list. We’ll email you when your place opens.',
        };
    } catch (error) {
        console.error('Ojogbon pilot sign-up error:', error);
        return { error: { email: ['We couldn’t save your details. Please try again.'] } };
    }
}
