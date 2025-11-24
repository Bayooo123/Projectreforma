// Notification Service - Intelligent Detection Engine
// This will be connected to the database in production

export type NotificationType = 'alert' | 'info' | 'success' | 'warning' | 'critical';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationStatus = 'unread' | 'read' | 'dismissed' | 'actioned';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    recipientId: string;
    recipientType: 'lawyer' | 'client' | 'partner' | 'staff';
    relatedMatterId?: string;
    relatedBriefId?: string;
    priority: NotificationPriority;
    status: NotificationStatus;
    channels: ('in-app' | 'email' | 'sms')[];
    createdAt: Date;
    readAt?: Date;
    actionedAt?: Date;
}

export interface Matter {
    id: string;
    caseNumber: string;
    name: string;
    clientId: string;
    assignedLawyerId: string;
    court?: string;
    judge?: string;
    status: 'active' | 'inactive' | 'closed';
    nextCourtDate?: Date;
    lastActivityAt: Date;
    lastClientContact?: Date;
    createdAt: Date;
}

// ============================================
// INTELLIGENT DETECTION FUNCTIONS
// ============================================

/**
 * Detects dormant matters (no activity in X days)
 */
export function detectDormantMatters(matters: Matter[], thresholdDays: number = 14): Matter[] {
    const now = new Date();
    const threshold = thresholdDays * 24 * 60 * 60 * 1000; // Convert to milliseconds

    return matters.filter(matter => {
        const daysSinceActivity = now.getTime() - matter.lastActivityAt.getTime();
        return matter.status === 'active' && daysSinceActivity > threshold;
    });
}

/**
 * Detects matters where client hasn't been contacted recently
 */
export function detectClientUpdateNeeded(matters: Matter[], thresholdDays: number = 21): Matter[] {
    const now = new Date();
    const threshold = thresholdDays * 24 * 60 * 60 * 1000;

    return matters.filter(matter => {
        if (!matter.lastClientContact) return true; // Never contacted
        const daysSinceContact = now.getTime() - matter.lastClientContact.getTime();
        return matter.status === 'active' && daysSinceContact > threshold;
    });
}

/**
 * Detects upcoming court dates that need client notification
 */
export function detectUpcomingCourtDates(matters: Matter[], daysAhead: number = 7): Matter[] {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000));

    return matters.filter(matter => {
        if (!matter.nextCourtDate) return false;
        const courtDate = new Date(matter.nextCourtDate);
        return courtDate > now && courtDate <= futureDate;
    });
}

/**
 * Generates notifications based on detected issues
 */
export function generateNotificationsForDormantMatters(
    dormantMatters: Matter[],
    thresholdDays: number
): Notification[] {
    return dormantMatters.map(matter => {
        const daysSinceActivity = Math.floor(
            (new Date().getTime() - matter.lastActivityAt.getTime()) / (24 * 60 * 60 * 1000)
        );

        const priority: NotificationPriority =
            daysSinceActivity > 30 ? 'critical' :
                daysSinceActivity > 21 ? 'high' : 'medium';

        return {
            id: `notif-${matter.id}-${Date.now()}`,
            type: priority === 'critical' ? 'alert' : 'warning',
            title: `Matter Inactive for ${daysSinceActivity} Days`,
            message: `${matter.name} (${matter.caseNumber}) has had no activity for ${daysSinceActivity} days. Please review and update.`,
            recipientId: matter.assignedLawyerId,
            recipientType: 'lawyer',
            relatedMatterId: matter.id,
            priority,
            status: 'unread',
            channels: priority === 'critical' ? ['in-app', 'email'] : ['in-app'],
            createdAt: new Date(),
        };
    });
}

/**
 * Generates notifications for client update reminders
 */
export function generateNotificationsForClientUpdates(
    matters: Matter[]
): Notification[] {
    return matters.map(matter => {
        const daysSinceContact = matter.lastClientContact
            ? Math.floor((new Date().getTime() - matter.lastClientContact.getTime()) / (24 * 60 * 60 * 1000))
            : 999;

        return {
            id: `notif-client-${matter.id}-${Date.now()}`,
            type: 'warning',
            title: 'Client Update Required',
            message: matter.lastClientContact
                ? `Client for ${matter.name} hasn't been contacted in ${daysSinceContact} days. Please send an update.`
                : `Client for ${matter.name} has never been contacted. Please reach out immediately.`,
            recipientId: matter.assignedLawyerId,
            recipientType: 'lawyer',
            relatedMatterId: matter.id,
            priority: daysSinceContact > 30 ? 'high' : 'medium',
            status: 'unread',
            channels: ['in-app', 'email'],
            createdAt: new Date(),
        };
    });
}

/**
 * Generates notifications for upcoming court dates
 */
export function generateNotificationsForCourtDates(
    matters: Matter[]
): Notification[] {
    return matters.map(matter => {
        const daysUntilCourt = Math.ceil(
            (new Date(matter.nextCourtDate!).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)
        );

        const priority: NotificationPriority =
            daysUntilCourt <= 1 ? 'critical' :
                daysUntilCourt <= 3 ? 'high' : 'medium';

        return {
            id: `notif-court-${matter.id}-${Date.now()}`,
            type: daysUntilCourt <= 1 ? 'critical' : 'warning',
            title: `Court Date in ${daysUntilCourt} Day${daysUntilCourt > 1 ? 's' : ''}`,
            message: `${matter.name} has a court appearance on ${new Date(matter.nextCourtDate!).toLocaleDateString()}. Ensure client is notified and prepared.`,
            recipientId: matter.assignedLawyerId,
            recipientType: 'lawyer',
            relatedMatterId: matter.id,
            priority,
            status: 'unread',
            channels: daysUntilCourt <= 1 ? ['in-app', 'email', 'sms'] : ['in-app', 'email'],
            createdAt: new Date(),
        };
    });
}

/**
 * Main function to run all detection checks and generate notifications
 */
export function runNotificationEngine(matters: Matter[]): Notification[] {
    const notifications: Notification[] = [];

    // Check for dormant matters
    const dormantMatters = detectDormantMatters(matters, 14);
    notifications.push(...generateNotificationsForDormantMatters(dormantMatters, 14));

    // Check for client update needs
    const needsClientUpdate = detectClientUpdateNeeded(matters, 21);
    notifications.push(...generateNotificationsForClientUpdates(needsClientUpdate));

    // Check for upcoming court dates
    const upcomingCourt = detectUpcomingCourtDates(matters, 7);
    notifications.push(...generateNotificationsForCourtDates(upcomingCourt));

    return notifications;
}
