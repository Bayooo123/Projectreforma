import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = [
    'public.blob.vercel-storage.com',
    'blob.vercel-storage.com',
];

function isAllowedUrl(url: string): boolean {
    try {
        const { hostname } = new URL(url);
        return ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h));
    } catch {
        return false;
    }
}

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');

    if (!url || !isAllowedUrl(url)) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    try {
        const upstream = await fetch(url, {
            headers: { 'User-Agent': 'ReformaOS/1.0' },
        });

        if (!upstream.ok) {
            return new NextResponse('File not found', { status: upstream.status });
        }

        const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
        const body = await upstream.arrayBuffer();

        return new NextResponse(body, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': 'inline',
                // Remove blocking headers — allow embedding in our own iframe
                'X-Frame-Options': 'SAMEORIGIN',
                'Content-Security-Policy': "default-src 'self'",
                'Cache-Control': 'private, max-age=300',
            },
        });
    } catch (e) {
        return new NextResponse('Failed to fetch document', { status: 502 });
    }
}
