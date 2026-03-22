/**
 * rate-limit.ts
 *
 * Database-backed sliding-window rate limiter using the RateLimit Prisma model.
 * Suitable for Next.js edge-adjacent route handlers.
 *
 * Usage:
 *   const limited = await checkRateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000);
 *   if (limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 */

import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

/**
 * Returns `true` if the rate limit has been exceeded (request should be blocked).
 * Returns `false` if the request is within the allowed limit.
 *
 * @param key       - Unique identifier for the rate limit bucket (e.g. "login:<ip>")
 * @param limit     - Maximum number of requests allowed in the window
 * @param windowMs  - Window duration in milliseconds
 */
export async function checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + windowMs);

    const record = await prisma.rateLimit.upsert({
        where: { key },
        update: {
            count: {
                // Reset if window has expired, otherwise increment
                increment: 1,
            },
            // Only update expiresAt if we're resetting (handled below)
        },
        create: {
            key,
            count: 1,
            expiresAt,
        },
    });

    // If window has expired, reset the counter
    if (record.expiresAt < now) {
        await prisma.rateLimit.update({
            where: { key },
            data: { count: 1, expiresAt },
        });
        return false;
    }

    return record.count > limit;
}

/**
 * Extracts the best available client IP from a Next.js request.
 * Checks x-forwarded-for, then x-real-ip, then falls back to 'unknown'.
 */
export function getClientIp(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.headers.get('x-real-ip') ?? 'unknown';
}
