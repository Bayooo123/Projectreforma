import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/lib/config';
import { checkRateLimit } from '@/lib/services/auth/ratelimit';
import { extractJson, requireOjogbonUser } from '@/lib/ojogbon/server';

// Evaluations of long drafts and whole-paper reviews can take well over a minute.
export const maxDuration = 300;

const MAX_PROMPT_CHARS = 260_000;
const MODELS = {
    complex: 'claude-sonnet-5',
    quick: 'claude-haiku-4-5-20251001',
} as const;

/**
 * Ojogbon's single AI endpoint. The studio sends a fully built prompt that asks
 * for JSON; this route authenticates, rate-limits per user, calls Claude and
 * returns the parsed JSON. Signed-in users only.
 */
export async function POST(req: NextRequest) {
    const who = await requireOjogbonUser();
    if (who instanceof NextResponse) return who;

    if (!config.ANTHROPIC_API_KEY) {
        return NextResponse.json({ code: 'unavailable', error: 'AI is not configured.' }, { status: 503 });
    }

    const rl = await checkRateLimit({ key: `ojogbon-ai:${who.userId}`, limit: 120, windowSeconds: 60 * 60 });
    if (!rl.success) {
        return NextResponse.json(
            { code: 'rate_limited', error: 'You’ve reached the hourly limit. Try again shortly.' },
            { status: 429 },
        );
    }

    let body: { prompt?: unknown; tier?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ code: 'bad_request', error: 'Invalid request.' }, { status: 400 });
    }
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    if (!prompt || prompt.length > MAX_PROMPT_CHARS) {
        return NextResponse.json({ code: 'bad_request', error: 'The text is empty or too long.' }, { status: 400 });
    }
    const model = body.tier === 'complex' ? MODELS.complex : MODELS.quick;

    try {
        const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
        const res = await client.messages.create({
            model,
            max_tokens: 8000,
            system:
                'You are Ojogbon, an academic writing supervisor. You coach; you never write the user’s paper for them. Always reply with valid JSON only, exactly in the shape the user asks for.',
            messages: [{ role: 'user', content: prompt }],
        });
        const text = res.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map(b => b.text)
            .join('');
        try {
            return NextResponse.json({ json: extractJson(text) });
        } catch {
            return NextResponse.json({ code: 'invalid_json', error: 'The answer couldn’t be read. Try again.' }, { status: 502 });
        }
    } catch (error) {
        const status = (error as { status?: number })?.status;
        console.error('[ojogbon/ai] Anthropic call failed', { status, model, message: (error as Error)?.message });
        if (status === 429 || status === 529) {
            return NextResponse.json({ code: 'rate_limited', error: 'Claude is busy. Try again in a minute.' }, { status: 429 });
        }
        return NextResponse.json({ code: 'error', error: 'Claude couldn’t answer. Try again.' }, { status: 502 });
    }
}
