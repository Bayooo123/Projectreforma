import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/lib/config';

export interface EmailAnalysis {
    summary: string;
    statusUpdate: string;
    actionItems: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
}

export interface BriefCandidate {
    id: string;
    name: string;
    briefNumber: string;
    clientName: string;
}

function getClient(): Anthropic | null {
    if (!config.ANTHROPIC_API_KEY) return null;
    return new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
}

function parseJSON<T>(text: string): T | null {
    try {
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(clean) as T;
    } catch {
        return null;
    }
}

export async function identifyBriefFromContent(
    subject: string,
    body: string,
    candidates: BriefCandidate[]
): Promise<{ briefId: string | null; confidence: number; reasoning: string }> {
    const client = getClient();
    if (!client) return { briefId: null, confidence: 0, reasoning: 'No AI Key' };
    if (candidates.length === 0) return { briefId: null, confidence: 0, reasoning: 'No briefs found' };

    const candidatesJson = JSON.stringify(
        candidates.map(c => ({ id: c.id, label: `${c.briefNumber} - ${c.name} (Client: ${c.clientName})` }))
    );

    try {
        const response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 256,
            system: 'You are a routing assistant for a legal firm. Return only valid JSON — no markdown, no explanation.',
            messages: [{
                role: 'user',
                content: `Match this email to one of the active briefs listed below.

Email Subject: ${subject}
Email Body Snippet: ${body.substring(0, 500)}

Candidate Briefs:
${candidatesJson}

Rules:
- If the email explicitly mentions a Brief Number (e.g. BRF-001), match it with 1.0 confidence.
- If it matches a Brief Name closely, match with high confidence.
- If ambiguous, return null.

Return exactly this JSON shape:
{"briefId": "<id or null>", "confidence": <0.0-1.0>, "reasoning": "<why>"}`,
            }],
        });

        const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
        return parseJSON(text) ?? { briefId: null, confidence: 0, reasoning: 'Parse error' };
    } catch (error) {
        console.error('Error identifying brief:', error);
        return { briefId: null, confidence: 0, reasoning: 'AI Error' };
    }
}

export async function processEmailWithAI(
    subject: string,
    body: string,
    sender: string
): Promise<EmailAnalysis> {
    const client = getClient();
    if (!client) {
        return {
            summary: 'AI processing unavailable (no API key).',
            statusUpdate: `Email received from ${sender}: ${subject}`,
            actionItems: [],
            sentiment: 'neutral',
        };
    }

    try {
        const response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 512,
            system: 'You are an expert legal assistant. Return only valid JSON — no markdown, no explanation.',
            messages: [{
                role: 'user',
                content: `Analyze this email for a Nigerian law firm's case file.

Email Subject: ${subject}
Sender: ${sender}
Body:
${body}

Return exactly this JSON shape:
{
  "summary": "<1-sentence summary>",
  "statusUpdate": "<professional status update for client or partner>",
  "actionItems": ["<action 1>", "<action 2>"],
  "sentiment": "<positive|neutral|negative>"
}

Rules:
1. Ignore email signatures, legal disclaimers, and thread history.
2. Focus on the most recent and critical information.
3. If the email is just FYI, reflect that in a short summary.`,
            }],
        });

        const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
        return parseJSON<EmailAnalysis>(text) ?? {
            summary: 'Failed to parse AI response.',
            statusUpdate: `Email received: ${subject}`,
            actionItems: ['Review original email'],
            sentiment: 'neutral',
        };
    } catch (error) {
        console.error('Error processing email with AI:', error);
        return {
            summary: 'Failed to process email content.',
            statusUpdate: `Email received: ${subject}`,
            actionItems: ['Review original email'],
            sentiment: 'neutral',
        };
    }
}
