
import { prisma } from '@/lib/prisma';

export interface RateLimitOptions {
    key: string;
    limit: number;
    windowSeconds: number;
}

/**
 * Basic rate limiter using Prisma.
 * Returns true if the request is within limits, false otherwise.
 */
export async function checkRateLimit(options: RateLimitOptions): Promise<{ success: boolean; remaining: number }> {
    const { key, limit, windowSeconds } = options;
    const now = new Date();

    // Cleanup expired entries occasionally (or just rely on the query check)
    // For production, a background job would be better.

    const rateLimit = await prisma.rateLimit.upsert({
        where: { key },
        update: {},
        create: {
            key,
            count: 0,
            expiresAt: new Date(now.getTime() + windowSeconds * 1000),
        },
    });

    if (rateLimit.expiresAt < now) {
        // Reset window
        await prisma.rateLimit.update({
            where: { key },
            data: {
                count: 1,
                expiresAt: new Date(now.getTime() + windowSeconds * 1000),
            },
        });
        return { success: true, remaining: limit - 1 };
    }

    if (rateLimit.count >= limit) {
        return { success: false, remaining: 0 };
    }

    const updated = await prisma.rateLimit.update({
        where: { key },
        data: { count: { increment: 1 } },
    });

    return { success: true, remaining: limit - updated.count };
}

/**
 * Helper to get client IP from headers.
 */
export function getClientIp(headers: Headers): string {
    const forwarded = headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return 'unknown';
}
