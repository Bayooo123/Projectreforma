import { NextRequest, NextResponse } from 'next/server';
import { scanBriefsAllWorkspaces } from '@/lib/agents/brief-manager/scan';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    try {
        await scanBriefsAllWorkspaces();
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[brief-manager-scan] Error:', error);
        return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
    }
}
