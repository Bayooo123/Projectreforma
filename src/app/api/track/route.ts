import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const BOT_PATTERNS = /bot|crawler|spider|crawling|facebookexternalhit|twitterbot|linkedinbot|googlebot|bingbot|slurp|duckduckbot|yandex|baidu|sogou|exabot|ia_archiver/i;

function parseUserAgent(ua: string) {
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'desktop';

    if (/mobile|android|iphone|ipad|ipod/i.test(ua)) device = 'mobile';
    else if (/tablet|ipad/i.test(ua)) device = 'tablet';

    if (/chrome\/[\d.]+/i.test(ua) && !/edg|opr/i.test(ua)) browser = 'Chrome';
    else if (/firefox\/[\d.]+/i.test(ua)) browser = 'Firefox';
    else if (/safari\/[\d.]+/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/edg\/[\d.]+/i.test(ua)) browser = 'Edge';
    else if (/opr\/[\d.]+/i.test(ua)) browser = 'Opera';

    if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/linux/i.test(ua)) os = 'Linux';

    return { browser, os, device };
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const { page = '/', sessionId, referrer } = body;

        const ua = req.headers.get('user-agent') || '';
        if (BOT_PATTERNS.test(ua)) {
            return NextResponse.json({ ok: true });
        }

        // IP resolution
        const ip =
            req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            req.headers.get('x-real-ip') ||
            null;

        // Vercel geo headers (populated automatically when deployed on Vercel)
        const city = req.headers.get('x-vercel-ip-city') || null;
        const country = req.headers.get('x-vercel-ip-country') || null;
        const region = req.headers.get('x-vercel-ip-country-region') || null;

        const { browser, os, device } = parseUserAgent(ua);

        await prisma.siteVisit.create({
            data: {
                ip,
                city,
                country,
                region,
                userAgent: ua.slice(0, 512),
                browser,
                os,
                device,
                referrer: referrer ? String(referrer).slice(0, 512) : null,
                page: String(page).slice(0, 255),
                sessionId: sessionId ? String(sessionId).slice(0, 64) : null,
            },
        });

        return NextResponse.json({ ok: true });
    } catch (e) {
        // Never let tracking errors surface to the user
        return NextResponse.json({ ok: true });
    }
}
