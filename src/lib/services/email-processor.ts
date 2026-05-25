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

export type EmailIntentType =
    | 'CLIENT_QUERY'
    | 'COURT_NOTICE'
    | 'ADJOURNMENT'
    | 'DOCUMENT_RECEIVED'
    | 'PAYMENT'
    | 'NEW_INSTRUCTION'
    | 'CORRESPONDENCE';

export type UrgencyLevel = 'critical' | 'high' | 'normal' | 'low';
export type SenderType = 'client' | 'court' | 'counsel' | 'other';

export interface EmailIntent {
    intent: EmailIntentType;
    urgency: UrgencyLevel;
    senderType: SenderType;
    title: string;
    summary: string;
    actionItems: string[];
}

export async function classifyEmailIntent(
    subject: string,
    body: string,
    sender: string
): Promise<EmailIntent> {
    const fallback: EmailIntent = {
        intent: 'CORRESPONDENCE',
        urgency: 'normal',
        senderType: 'other',
        title: subject || 'New Email',
        summary: `Email received from ${sender}`,
        actionItems: ['Review email'],
    };

    const client = getClient();
    if (!client) return fallback;

    try {
        const response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 512,
            system: 'You are an intelligent routing assistant for a Nigerian law firm. Return only valid JSON — no markdown, no explanation.',
            messages: [{
                role: 'user',
                content: `Classify this email for a Nigerian law firm's institutional memory system.

Sender: ${sender}
Subject: ${subject}
Body:
${body.substring(0, 800)}

Return exactly this JSON:
{
  "intent": "<CLIENT_QUERY|COURT_NOTICE|ADJOURNMENT|DOCUMENT_RECEIVED|PAYMENT|NEW_INSTRUCTION|CORRESPONDENCE>",
  "urgency": "<critical|high|normal|low>",
  "senderType": "<client|court|counsel|other>",
  "title": "<short descriptive title, max 80 chars>",
  "summary": "<1-2 sentence summary of what this email is about and what it requires>",
  "actionItems": ["<action 1>", "<action 2>"]
}

Classification rules:
- COURT_NOTICE: anything from a court registry, judge's chambers, tribunal
- ADJOURNMENT: email mentioning adjournment, new hearing date, postponement
- CLIENT_QUERY: client asking for update, information, or clarification
- DOCUMENT_RECEIVED: email primarily about a document, attachment, or filing
- PAYMENT: fee notes, invoices, payment receipts, financial requests
- NEW_INSTRUCTION: client giving new instructions or new matter
- CORRESPONDENCE: everything else (general correspondence, FYI, acknowledgements)

Urgency rules:
- critical: court date within 48hrs, judgment received, urgent injunction
- high: court notice, payment demand, new client instruction
- normal: client query, general correspondence
- low: acknowledgements, FYI emails`,
            }],
        });

        const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
        return parseJSON<EmailIntent>(text) ?? fallback;
    } catch (error) {
        console.error('Error classifying email intent:', error);
        return fallback;
    }
}

export interface CourtDateExtraction {
    date: string | null;       // ISO string
    court: string | null;
    judge: string | null;
    nextHearingPurpose: string | null;
}

export async function extractCourtDate(
    subject: string,
    body: string
): Promise<CourtDateExtraction> {
    const fallback: CourtDateExtraction = { date: null, court: null, judge: null, nextHearingPurpose: null };
    const client = getClient();
    if (!client) return fallback;

    try {
        const response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 256,
            system: 'You are a legal date extraction assistant. Return only valid JSON — no markdown, no explanation.',
            messages: [{
                role: 'user',
                content: `Extract court date information from this email. Today is ${new Date().toISOString().split('T')[0]}.

Subject: ${subject}
Body:
${body.substring(0, 1000)}

Return exactly this JSON (use null for unknown fields):
{
  "date": "<ISO date string YYYY-MM-DD or null>",
  "court": "<court name or null>",
  "judge": "<judge name or null>",
  "nextHearingPurpose": "<purpose of next hearing e.g. 'Hearing of Motion' or null>"
}

Rules:
- Extract the NEXT/FUTURE hearing date, not past dates
- If the email mentions adjournment to a new date, extract the NEW date
- Convert Nigerian date formats (e.g. "15th July, 2026") to ISO format`,
            }],
        });

        const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
        return parseJSON<CourtDateExtraction>(text) ?? fallback;
    } catch {
        return fallback;
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
