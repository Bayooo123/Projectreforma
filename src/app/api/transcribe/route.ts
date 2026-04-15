import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';

/**
 * Legacy compatibility endpoint.
 * Kept so existing clients and generated route validators resolve correctly.
 */
export async function POST() {
    try {
        await requireAuth();
        return NextResponse.json({
            success: true,
            status: 'processing',
            message: 'Use /api/meetings/transcribe for meeting transcription updates.',
        });
    } catch (error: any) {
        if (String(error?.message || '').toLowerCase().includes('unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to process transcription' }, { status: 500 });
    }
}
