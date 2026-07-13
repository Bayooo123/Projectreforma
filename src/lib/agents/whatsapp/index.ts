import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from './send';
import { getOrCreateSession, appendToSession, getHistory } from './session';
import { dispatch } from './dispatcher';
import { runBriefManager } from './brief-manager';
import { AgentContext } from './types';

// Normalise phone numbers — WhatsApp sends them without the + prefix
function normalisePhone(raw: string): string {
    return raw.replace(/\D/g, '');
}

async function resolveUser(fromNumber: string): Promise<{ userId: string; userName: string; workspaceId: string; firmName: string } | null> {
    const normalised = normalisePhone(fromNumber);

    // Try exact match first, then without country code prefix variants
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { phone: fromNumber },
                { phone: `+${normalised}` },
                { phone: normalised },
            ],
        },
        select: { id: true, name: true, workspaces: { select: { workspaceId: true, workspace: { select: { name: true } } } } },
    });

    if (!user || user.workspaces.length === 0) return null;

    const membership = user.workspaces[0];
    return {
        userId: user.id,
        userName: user.name ?? 'Colleague',
        workspaceId: membership.workspaceId,
        firmName: membership.workspace.name,
    };
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

    // Route to the correct agent
    const agent = await dispatch(text);

    let reply: string;
    try {
        if (agent === 'brief_manager') {
            reply = await runBriefManager(text, ctx, history);
        } else if (agent === 'calendar') {
            // Calendar agent — brief_manager handles hearings for now until calendar agent is built
            reply = await runBriefManager(text, ctx, history);
        } else {
            reply = "I can help with briefs and case information. Try asking about a specific case or client.";
        }
    } catch (err) {
        console.error('[WhatsApp Agent] Error:', err);
        reply = 'Something went wrong on my end. Please try again in a moment.';
    }

    // Send response and persist conversation
    await sendWhatsAppMessage(fromNumber, reply);
    await appendToSession(fromNumber, resolved.workspaceId, text, reply);
}
