/**
 * sanitize.ts
 *
 * Lightweight server-side sanitizer for free-text inputs.
 * Strips script tags, event attributes, and javascript: URLs
 * to prevent stored XSS in user-supplied content.
 *
 * Usage:
 *   import { sanitizeText } from '@/lib/sanitize';
 *   const clean = sanitizeText(userInput);
 */

/**
 * Strip dangerous HTML from a user-supplied string.
 * This is intentionally simple — Prisma/PostgreSQL does NOT interpret HTML,
 * so this is a defence-in-depth measure for values that might be rendered in UI.
 */
export function sanitizeText(input: unknown): string {
    if (typeof input !== 'string') return '';

    return input
        // Remove script tags and their content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove on* event attributes (onclick, onmouseover, etc.)
        .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
        // Remove javascript: URI scheme
        .replace(/javascript\s*:/gi, '')
        // Remove data: URI scheme (used for XSS in img src)
        .replace(/data\s*:/gi, '')
        // Remove other dangerous tags
        .replace(/<(?:iframe|object|embed|form|input|button)[^>]*>/gi, '')
        .trim();
}

/**
 * Sanitize an object's string values recursively.
 * Useful for sanitizing entire request bodies.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            result[key] = sanitizeText(value);
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            result[key] = sanitizeObject(value as Record<string, unknown>);
        } else {
            result[key] = value;
        }
    }
    return result as T;
}
