import { Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient;

/**
 * Schedules 3-day and day-of email reminders for a CalendarEntry.
 * Call this inside a transaction immediately after creating the entry.
 */
export async function scheduleCourtReminders(
    db: Db,
    calendarEntryId: string,
    courtDate: Date,
    matterId: string,
    recipientIds: string[]
) {
    if (recipientIds.length === 0) return;

    const now = new Date();
    const rows: Prisma.ScheduledNotificationCreateManyInput[] = [];

    const slot = (type: string, daysOffset: number, hour: number, minute = 0) => {
        const t = new Date(courtDate);
        t.setDate(t.getDate() - daysOffset);
        t.setHours(hour, minute, 0, 0);
        if (t <= now) return;
        for (const recipientId of [...new Set(recipientIds)]) {
            rows.push({ calendarEntryId, matterId, recipientId, notificationType: type, scheduledFor: t });
        }
    };

    slot('three_day', 3, 7);    // 7:00am WAT, 3 days before
    slot('day_of',    0, 6, 30); // 6:30am WAT, day of court

    if (rows.length > 0) {
        await db.scheduledNotification.createMany({ data: rows, skipDuplicates: true });
    }
}
