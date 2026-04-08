import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, subscription } = await req.json();

        if (action === 'subscribe') {
            if (!subscription || !subscription.endpoint || !subscription.keys) {
                return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
            }

            await prisma.pushSubscription.upsert({
                where: { endpoint: subscription.endpoint },
                update: {
                    userId: session.user.id,
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth,
                },
                create: {
                    userId: session.user.id,
                    endpoint: subscription.endpoint,
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth,
                },
            });

            return NextResponse.json({ success: true, message: 'Subscribed to push notifications' });
        } else if (action === 'unsubscribe') {
            if (!subscription || !subscription.endpoint) {
                return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
            }

            await prisma.pushSubscription.deleteMany({
                where: {
                    endpoint: subscription.endpoint,
                    userId: session.user.id,
                },
            });

            return NextResponse.json({ success: true, message: 'Unsubscribed from push notifications' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Push notification (un)subscribe error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
