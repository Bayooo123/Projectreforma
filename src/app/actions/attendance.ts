'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

function toDateOnly(d: Date): Date {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export async function getWorkspaceGeofence(workspaceId: string) {
    return prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
            geofenceEnabled: true,
            geofenceLat: true,
            geofenceLng: true,
            geofenceRadius: true,
            geofenceAddress: true,
        },
    });
}

export async function getTodayAttendance(workspaceId: string) {
    const session = await auth();
    if (!session?.user?.id) return null;

    const today = toDateOnly(new Date());
    return prisma.attendanceRecord.findUnique({
        where: { userId_workspaceId_date: { userId: session.user.id, workspaceId, date: today } },
    });
}

export async function clockIn(workspaceId: string, lat?: number, lng?: number) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const today = toDateOnly(new Date());

    // Upsert — if already clocked in today, return existing record
    const record = await prisma.attendanceRecord.upsert({
        where: { userId_workspaceId_date: { userId: session.user.id, workspaceId, date: today } },
        create: {
            userId: session.user.id,
            workspaceId,
            date: today,
            clockIn: new Date(),
            lat: lat ?? null,
            lng: lng ?? null,
        },
        update: {},
    });

    revalidatePath('/management/attendance');
    return { success: true, data: record, alreadyClockedIn: record.createdAt < new Date(Date.now() - 5000) };
}

export async function clockOut(workspaceId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const today = toDateOnly(new Date());

    try {
        const record = await prisma.attendanceRecord.update({
            where: { userId_workspaceId_date: { userId: session.user.id, workspaceId, date: today } },
            data: { clockOut: new Date() },
        });
        revalidatePath('/management/attendance');
        return { success: true, data: record };
    } catch {
        return { success: false, error: 'No clock-in record found for today' };
    }
}

export async function getAttendanceReport(workspaceId: string, date?: Date) {
    const session = await auth();
    if (!session?.user?.id) return [];

    const targetDate = toDateOnly(date ?? new Date());

    return prisma.attendanceRecord.findMany({
        where: { workspaceId, date: targetDate },
        include: {
            user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { clockIn: 'asc' },
    });
}

export async function getAttendanceRangeReport(workspaceId: string, from: Date, to: Date) {
    const session = await auth();
    if (!session?.user?.id) return [];

    return prisma.attendanceRecord.findMany({
        where: {
            workspaceId,
            date: { gte: toDateOnly(from), lte: toDateOnly(to) },
        },
        include: {
            user: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ date: 'desc' }, { clockIn: 'asc' }],
    });
}
