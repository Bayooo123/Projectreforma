import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';
import { sendWhatsAppMessage } from './send';
import { getOrCreateSession, appendToSession, getHistory } from './session';
import { runBriefManagerAnthropic } from './brief-manager';
import { runBriefManagerOpenAI } from './brief-manager-openai';
import { AgentContext, HistoryMessage } from './types';

// Provider router: OpenAI primary when configured, Anthropic as fallback —
// both on a genuine failure and whenever OPENAI_API_KEY isn't set at all, so
// this is a no-op (Anthropic-only, today's behavior) until that key exists.
async function runBriefManager(message: string, ctx: AgentContext, history: HistoryMessage[]): Promise<string> {
    if (config.OPENAI_API_KEY) {
        try {
            return await runBriefManagerOpenAI(message, ctx, history);
        } catch (err) {
            console.error('[WhatsApp Agent] OpenAI provider failed, falling back to Anthropic:', err);
        }
    }
    return runBriefManagerAnthropic(message, ctx, history);
}

// Normalise phone numbers — WhatsApp sends them without the + prefix
function normalisePhone(raw: string): string {
    return raw.replace(/\D/g, '');
}

// Nigerian numbers are routinely entered in two incompatible shapes — local
// ("0803...") and international ("234803...") — depending on who typed them
// in and when. WhatsApp always sends international-with-no-plus. Without
// this, a genuinely registered lawyer whose profile has the local form gets
// told they're "not registered".
function phoneCandidates(normalised: string): string[] {
    const candidates = new Set([normalised]);
    if (normalised.startsWith('234') && normalised.length === 13) {
        candidates.add(`0${normalised.slice(3)}`);
    } else if (normalised.startsWith('0') && normalised.length === 11) {
        candidates.add(`234${normalised.slice(1)}`);
    }
    return Array.from(candidates);
}

type ResolvedUser = { userId: string; userName: string; workspaceId: string; firmName: string };

function toResolvedUser(user: { id: string; name: string | null; workspaces: { workspaceId: string; workspace: { name: string } }[] }): ResolvedUser | null {
    const membership = user.workspaces[0];
    if (!membership) return null;
    return {
        userId: user.id,
        userName: user.name ?? 'Colleague',
        workspaceId: membership.workspaceId,
        firmName: membership.workspace.name,
    };
}

const userSelect = {
    id: true, name: true, phone: true,
    workspaces: { select: { workspaceId: true, workspace: { select: { name: true } } } },
} as const;

export async function resolveUser(fromNumber: string): Promise<ResolvedUser | null> {
    const normalised = normalisePhone(fromNumber);
    const candidates = phoneCandidates(normalised);

    // Fast path: exact match against the raw value plus the common local/
    // international/+-prefixed representations — covers the overwhelming
    // majority of correctly entered numbers, index-backed.
    let user = await prisma.user.findFirst({
        where: { OR: candidates.flatMap(c => [{ phone: c }, { phone: `+${c}` }]) },
        select: userSelect,
    });

    // Fallback: a firm's whole user base is small (dozens, not millions), so
    // comparing digits-only is cheap and catches formatting the stored value
    // carries (spaces, dashes, parentheses) that an exact-match query can't
    // see through.
    if (!user) {
        const candidates10 = candidates.map(c => c.slice(-10)).filter(c => c.length === 10);
        const withPhone = await prisma.user.findMany({
            where: { phone: { not: null } },
            select: userSelect,
        });
        user = withPhone.find(u => {
            const dbDigits = normalisePhone(u.phone!).slice(-10);
            return candidates10.includes(dbDigits);
        }) ?? null;
    }

    if (!user) return null;
    return toResolvedUser(user);
}

export async function handleWhatsAppMessage(fromNumber: string, text: string): Promise<void> {
    // Resolve user from phone number
    const resolved = await resolveUser(fromNumber);
    if (!resolved) {
        await sendWhatsAppMessage(
            fromNumber,
            'Your number is not registered on Reforma. Ask your firm administrator to add your phone number to your profile.',
        );
        return;
    }

    const ctx: AgentContext = { fromNumber, ...resolved };

    // Get or create session and load history
    const session = await getOrCreateSession(fromNumber, resolved.workspaceId);
    const history = getHistory(session);

    // One agent, the full workspace toolset — there's no longer a separate
    // "calendar" vs "brief" path to route between (both used to call the
    // same function anyway), so the routing step is gone.
    let reply: string;
    try {
        reply = await runBriefManager(text, ctx, history);
    } catch (err) {
        console.error('[WhatsApp Agent] Error:', err);
        reply = 'Something went wrong on my end. Please try again in a moment.';
    }

    // Send response and persist conversation
    await sendWhatsAppMessage(fromNumber, reply);
    await appendToSession(fromNumber, resolved.workspaceId, text, reply);
}
