import { prisma } from './prisma';

export type ActivityResource =
    | 'BRIEF' | 'DOCUMENT' | 'INVOICE' | 'PAYMENT' | 'EXPENSE' | 'COMPLIANCE';

export type ActivityAction =
    | 'CREATED' | 'UPDATED' | 'DELETED'
    | 'VIEWED' | 'DOWNLOADED' | 'UPLOADED'
    | 'ACKNOWLEDGED';

export async function logActivity(data: {
    workspaceId: string;
    userId: string;
    resource: ActivityResource;
    action: ActivityAction;
    resourceId?: string;
    resourceName?: string;
    metadata?: Record<string, any>;
}): Promise<void> {
    try {
        await prisma.workspaceActivityLog.create({ data });
    } catch (e) {
        // Never let logging failures break the main flow
        console.error('[ActivityLog] Failed to record activity:', e);
    }
}
