'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function logBriefActivity(briefId: string, description: string) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    try {
        await prisma.briefActivityLog.create({
            data: {
                briefId,
                description,
                activityType: 'note_added', // Default for manual entry
                performedBy: session.user.id,
                metadata: {
                    source: 'manual_log'
                }
            }
        });

        // Also update the brief's updated time so it bumps up
        await prisma.brief.update({
            where: { id: briefId },
            data: { updatedAt: new Date() }
        });

        revalidatePath(`/briefs/${briefId}`);
        revalidatePath(`/management`); // For Firm Pulse
        return { success: true };
    } catch (error) {
        console.error("Failed to log brief activity:", error);
        return { success: false, error: "Failed to log activity" };
    }
}

export async function getBriefActivity(briefId: string) {
    const logs = await prisma.briefActivityLog.findMany({
        where: { briefId },
        orderBy: { timestamp: 'desc' },
        include: {
            user: {
                select: {
                    name: true,
                    image: true
                }
            }
        },
        take: 50
    });

    // Transform to match generic Log interface if needed, or return as is
    return logs.map(log => ({
        id: log.id,
        type: 'brief_log',
        activityType: log.activityType,
        description: log.description,
        performedBy: log.user?.name || 'System',
        timestamp: log.timestamp,
        userImage: log.user?.image
    }));
}
