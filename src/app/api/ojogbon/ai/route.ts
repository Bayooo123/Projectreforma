import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { config } from '@/lib/config';
import { checkRateLimit } from '@/lib/services/auth/ratelimit';
import { extractJson, requireOjogbonUser } from '@/lib/ojogbon/server';

// Evaluations of long drafts and whole-paper reviews can take well over a minute.
export const maxDuration = 300;

const MAX_PROMPT_CHARS = 260_000;
const SYSTEM =
    'You are Ojogbon, an academic writing supervisor. You coach; you never write the user’s paper for them. Always reply with valid JSON only, exactly in the shape the user asks for.';

type Tier = 'complex' | 'quick';
type Provider = 'openai' | 'anthropic';

/**
 * Which AI provider Ojogbon uses. Set OJOGBON_AI_PROVIDER to "openai" or
 * "anthropic" to choose explicitly; otherwise OpenAI is used when an
 * OPENAI_API_KEY is configured, and Anthropic when only that key is.
 */
function pickProvider(): Provider | null {
    const forced = process.env.OJOGBON_AI_PROVIDER?.toLowerCase();
    if (forced === 'openai' && config.OPENAI_API_KEY) return 'openai';
    if (forced === 'anthropic' && config.ANTHROPIC_API_KEY) return 'anthropic';
    if (config.OPENAI_API_KEY) return 'openai';
    if (config.ANTHROPIC_API_KEY) return 'anthropic';
    return null;
}

async function callOpenAI(prompt: string, tier: Tier): Promise<string> {
    const model =
        tier === 'complex'
            ? process.env.OJOGBON_OPENAI_MODEL || config.OPENAI_MODEL || 'gpt-4o'
            : process.env.OJOGBON_OPENAI_QUICK_MODEL || 'gpt-4o-mini';
    const client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
    const res = await client.chat.completions.create({
        model,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: prompt },
        ],
    });
    return res.choices[0]?.message?.content ?? '';
}

async function callAnthropic(prompt: string, tier: Tier): Promise<string> {
    const model = tier === 'complex' ? 'claude-sonnet-5' : 'claude-haiku-4-5-20251001';
    const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
        model,
        max_tokens: 8000,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
    });
    return res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('');
}

/**
 * Ojogbon's single AI endpoint. The studio sends a fully built prompt that asks
 * for JSON; this route authenticates, rate-limits per user, calls the configured
 * provider and returns the parsed JSON. Signed-in users only.
 */
export async function POST(req: NextRequest) {
    const who = await requireOjogbonUser();
    if (who instanceof NextResponse) return who;

    const provider = pickProvider();
    if (!provider) {
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
    const tier: Tier = body.tier === 'complex' ? 'complex' : 'quick';

    try {
        const text = provider === 'openai' ? await callOpenAI(prompt, tier) : await callAnthropic(prompt, tier);
        try {
            return NextResponse.json({ json: extractJson(text) });
        } catch {
            return NextResponse.json({ code: 'invalid_json', error: 'The answer couldn’t be read. Try again.' }, { status: 502 });
        }
    } catch (error) {
        const status = (error as { status?: number })?.status;
        console.error('[ojogbon/ai] provider call failed', { provider, tier, status, message: (error as Error)?.message });
        if (status === 429 || status === 529) {
            return NextResponse.json({ code: 'rate_limited', error: 'The AI service is busy. Try again in a minute.' }, { status: 429 });
        }
        return NextResponse.json({ code: 'error', error: 'Ojogbon couldn’t answer. Try again.' }, { status: 502 });
    }
}
