import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getUserNotifications } from '@/app/actions/notifications';
import NotificationsClient from './NotificationsClient';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const result = await getUserNotifications(50);
    const notifications = result.success ? (result.data || []) : [];
    const unreadCount = result.unreadCount || 0;

    return (
        <NotificationsClient
            initialNotifications={notifications as any}
            unreadCount={unreadCount}
        />
    );
}
