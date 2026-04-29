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

    revalidatePath('/management/office');
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
        revalidatePath('/management/office');
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

export async function getWorkspaceMembersBasic(workspaceId: string) {
    const session = await auth();
    if (!session?.user?.id) return [];

    const members = await prisma.workspaceMember.findMany({
        where: { workspaceId, status: 'active' },
        include: {
            user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { joinedAt: 'asc' },
    });
    return members.map(m => m.user);
}

export async function adminClockIn(workspaceId: string, targetUserId: string, clockInTime?: Date) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    // Verify requester is admin/owner
    const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: session.user.id, status: 'active' },
        select: { role: true },
    });
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } });
    const isAdmin = member && (['admin', 'owner'].includes(member.role) || workspace?.ownerId === session.user.id);
    if (!isAdmin) return { success: false, error: 'Only admins can manually clock in members' };

    const recordedTime = clockInTime ?? new Date();
    const today = toDateOnly(recordedTime);

    const record = await prisma.attendanceRecord.upsert({
        where: { userId_workspaceId_date: { userId: targetUserId, workspaceId, date: today } },
        create: { userId: targetUserId, workspaceId, date: today, clockIn: recordedTime },
        update: { clockIn: recordedTime },
    });

    revalidatePath('/management/office');
    return { success: true, data: record };
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

export async function getAttendanceStats(workspaceId: string, period: 'week' | 'month') {
    const session = await auth();
    if (!session?.user?.id) return [];

    const now = new Date();
    let from: Date;

    if (period === 'week') {
        const dayOfWeek = now.getDay(); // 0 = Sunday
        const start = new Date(now);
        start.setDate(now.getDate() - dayOfWeek);
        from = toDateOnly(start);
    } else {
        from = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    }

    const to = toDateOnly(now);

    const records = await prisma.attendanceRecord.findMany({
        where: { workspaceId, date: { gte: from, lte: to } },
        include: {
            user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { date: 'asc' },
    });

    const byUser: Record<string, {
        user: { id: string; name: string | null; email: string | null; image: string | null };
        clockInMinutes: number[];
    }> = {};

    for (const rec of records) {
        const uid = rec.userId;
        if (!byUser[uid]) byUser[uid] = { user: rec.user, clockInMinutes: [] };
        const ci = new Date(rec.clockIn);
        byUser[uid].clockInMinutes.push(ci.getHours() * 60 + ci.getMinutes());
    }

    return Object.values(byUser).map(u => {
        const avg = Math.round(u.clockInMinutes.reduce((a, b) => a + b, 0) / u.clockInMinutes.length);
        return {
            ...u.user,
            daysPresent: u.clockInMinutes.length,
            avgClockInMinutes: avg,
            earliestMinutes: Math.min(...u.clockInMinutes),
            latestMinutes: Math.max(...u.clockInMinutes),
        };
    }).sort((a, b) => a.avgClockInMinutes - b.avgClockInMinutes);
}
