import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import { PushSubscription } from '@prisma/client';

webpush.setVapidDetails(
    'mailto:info@reforma.ng',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data: any = {}
) {
    if (!process.env.VAPID_PRIVATE_KEY) {
        console.warn('VAPID_PRIVATE_KEY is not configured; push notifications disabled.');
        return;
    }

    try {
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId },
        });

        if (subscriptions.length === 0) return;

        const payload = JSON.stringify({
            title,
            body,
            icon: '/icon.png',
            badge: '/icon.png',
            data,
        });

        const notifications = subscriptions.map((sub: PushSubscription) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                },
            };

            return webpush
                .sendNotification(pushSubscription, payload)
                .catch(async (error) => {
                    if (error.statusCode === 404 || error.statusCode === 410) {
                        // Subscription expired or invalid; delete it
                        console.log('Subscription expired. Deleting endpoint:', sub.endpoint);
                        await prisma.pushSubscription.delete({
                            where: { id: sub.id },
                        });
                    } else {
                        console.error('Error sending push notification:', error);
                    }
                });
        });

        await Promise.all(notifications);
    } catch (error) {
        console.error('Failed to send push notification:', error);
    }
}
