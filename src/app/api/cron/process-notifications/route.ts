import { NextRequest, NextResponse } from 'next/server';
import { processScheduledNotifications } from '@/lib/processScheduledNotifications';

/**
 * Cron endpoint to process scheduled adjournment notifications
 * This should be called hourly by Vercel Cron or similar service
 * 
 * Security: Requires CRON_SECRET environment variable to match
 */
export async function GET(request: NextRequest) {
    try {
        // Verify cron secret for security
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            console.error('[Cron] CRON_SECRET not configured');
            return NextResponse.json(
                { error: 'Cron secret not configured' },
                { status: 500 }
            );
        }

        // Check authorization header
        if (authHeader !== `Bearer ${cronSecret}`) {
            console.error('[Cron] Unauthorized access attempt');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Process notifications
        console.log('[Cron] Starting scheduled notification processing...');
        const result = await processScheduledNotifications();

        if (result.success) {
            console.log(`[Cron] Success: ${result.processed} processed, ${result.failed} failed`);
            return NextResponse.json({
                success: true,
                processed: result.processed,
                failed: result.failed,
                errors: result.errors
            });
        } else {
            console.error('[Cron] Processing failed:', result.errors);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Processing failed',
                    details: result.errors
                },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('[Cron] Fatal error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
