'use server';

import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

/**
 * Get matters for a specific month
 */
export async function getMattersForMonth(
    workspaceId: string,
    year: number,
    month: number
) {
    try {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);

        const matters = await prisma.matter.findMany({
            where: {
                workspaceId,
                nextCourtDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                assignedLawyer: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { nextCourtDate: 'asc' },
        });

        return matters;
    } catch (error) {
        console.error('Error fetching matters for month:', error);
        return [];
    }
}

/**
 * Get upcoming matters (next N days)
 */
export async function getUpcomingMatters(workspaceId: string, days: number = 7) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        futureDate.setHours(23, 59, 59, 999);

        const matters = await prisma.matter.findMany({
            where: {
                workspaceId,
                status: 'active',
                nextCourtDate: {
                    gte: today,
                    lte: futureDate,
                },
            },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                assignedLawyer: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { nextCourtDate: 'asc' },
        });

        return matters;
    } catch (error) {
        console.error('Error fetching upcoming matters:', error);
        return [];
    }
}

/**
 * Generate a unique case number
 */
export async function generateCaseNumber(workspaceId: string): Promise<string> {
    try {
        const count = await prisma.matter.count({
            where: { workspaceId },
        });

        const year = new Date().getFullYear();
        const number = `CASE-${year}-${String(count + 1).padStart(4, '0')}`;

        // Check if exists (edge case)
        const existing = await prisma.matter.findUnique({
            where: { caseNumber: number },
        });

        if (existing) {
            return `CASE-${year}-${nanoid(6)}`;
        }

        return number;
    } catch (error) {
        console.error('Error generating case number:', error);
        return `CASE-${new Date().getFullYear()}-${nanoid(6)}`;
    }
}

/**
 * Get matter statistics
 */
export async function getMatterStats(workspaceId: string) {
    try {
        const [total, active, inactive, closed, upcoming] = await Promise.all([
            prisma.matter.count({ where: { workspaceId } }),
            prisma.matter.count({ where: { workspaceId, status: 'active' } }),
            prisma.matter.count({ where: { workspaceId, status: 'inactive' } }),
            prisma.matter.count({ where: { workspaceId, status: 'closed' } }),
            prisma.matter.count({
                where: {
                    workspaceId,
                    status: 'active',
                    nextCourtDate: {
                        gte: new Date(),
                        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    },
                },
            }),
        ]);

        return { total, active, inactive, closed, upcoming };
    } catch (error) {
        console.error('Error fetching matter stats:', error);
        return { total: 0, active: 0, inactive: 0, closed: 0, upcoming: 0 };
    }
}

/**
 * Search matters
 */
export async function searchMatters(workspaceId: string, query: string) {
    try {
        const matters = await prisma.matter.findMany({
            where: {
                workspaceId,
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { caseNumber: { contains: query, mode: 'insensitive' } },
                    { court: { contains: query, mode: 'insensitive' } },
                    { judge: { contains: query, mode: 'insensitive' } },
                ],
            },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                assignedLawyer: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { nextCourtDate: 'asc' },
            take: 20,
        });

        return matters;
    } catch (error) {
        console.error('Error searching matters:', error);
        return [];
    }
}
