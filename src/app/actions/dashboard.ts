'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getMyBriefs(limit: number = 5) {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    const briefs = await prisma.brief.findMany({
        where: {
            lawyerId: session.user.id,
            status: 'active'
        },
        orderBy: { updatedAt: 'desc' }, // Recently worked on
        take: limit,
        select: {
            id: true,
            briefNumber: true,
            name: true,
            client: { select: { name: true } },
            dueDate: true,
            status: true
        }
    });

    return briefs;
}
