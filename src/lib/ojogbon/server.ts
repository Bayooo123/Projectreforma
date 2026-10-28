import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/** Signed-in user id for Ojogbon API routes, or a 401 response. */
export async function requireOjogbonUser(): Promise<{ userId: string; name: string | null } | NextResponse> {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return NextResponse.json({ code: 'unauthorized', error: 'Log in to continue.' }, { status: 401 });
    }
    return { userId, name: session.user?.name ?? null };
}

/** Pull the first JSON object or array out of a model reply (tolerates ``` fences and stray prose). */
export function extractJson(text: string): unknown {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const body = (fenced ? fenced[1] : text).trim();
    try {
        return JSON.parse(body);
    } catch {
        const start = body.search(/[[{]/);
        const end = Math.max(body.lastIndexOf('}'), body.lastIndexOf(']'));
        if (start >= 0 && end > start) return JSON.parse(body.slice(start, end + 1));
        throw new Error('invalid_json');
    }
}
