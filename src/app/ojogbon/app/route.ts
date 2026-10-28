import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// The studio is a self-contained page (public/ojogbon-studio/app.html) served
// here only to signed-in users, so /ojogbon/app is the address people see.
export const dynamic = 'force-dynamic';

let cached: string | null = null;

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.redirect(new URL('/ojogbon/login', req.url));
    }
    if (!cached || process.env.NODE_ENV !== 'production') {
        cached = await readFile(path.join(process.cwd(), 'public', 'ojogbon-studio', 'app.html'), 'utf8');
    }
    return new NextResponse(cached, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' },
    });
}
