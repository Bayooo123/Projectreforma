import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
// Note: GOOGLE_API_KEY must be in .env. If not set, AI features will fail gracefully.
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || 'mock-key-for-build');

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

export async function identifyBriefFromContent(
    subject: string,
    body: string,
    candidates: BriefCandidate[]
): Promise<{ briefId: string | null; confidence: number; reasoning: string }> {
    if (!process.env.GOOGLE_API_KEY) {
        return { briefId: null, confidence: 0, reasoning: 'No AI Key' };
    }

    // Optimization: If candidates list is empty
    if (candidates.length === 0) return { briefId: null, confidence: 0, reasoning: 'No briefs found' };

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const candidatesJson = JSON.stringify(candidates.map(c => ({
        id: c.id,
        label: `${c.briefNumber} - ${c.name} (Client: ${c.clientName})`
    })));

    const prompt = `
    You are a routing assistant for a legal firm.
    Your task is to match an incoming email to one of the active briefs.
    
    Email Subject: ${subject}
    Email Body Snippet: ${body.substring(0, 500)}...
    
    Candidate Briefs:
    ${candidatesJson}
    
    Analyze the email content to see if it mentions the Case Number, Client Name, or Matter Name.
    Return a valid JSON object:
    {
        "briefId": "id-of-matched-brief" or null,
        "confidence": 0.0 to 1.0,
        "reasoning": "Why you picked this brief"
    }
    
    Rule:
    - If the email explicitly mentions a Brief Number (e.g. BRF-001), match it with 1.0 confidence.
    - If it matches Brief Name closely, match with high confidence.
    - If ambiguous, return null.
    `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
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
    if (!process.env.GOOGLE_API_KEY) {
        console.warn('GOOGLE_API_KEY not set. Using mock AI response.');
        return {
            summary: 'AI processing unavailable (no API key).',
            statusUpdate: `Email received from ${sender}: ${subject}`,
            actionItems: [],
            sentiment: 'neutral'
        };
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
    You are an expert legal assistant for the "Reforma" legal operating system.
    A lawyer has forwarded an email to this matter's activity feed.
    
    Email Subject: ${subject}
    Sender: ${sender}
    Body:
    ${body}

    Your task is to analyze this email and extract the key information for the case file.
    Return a strictly valid JSON object with the following structure:
    {
        "summary": "A concise 1-sentence summary of what happened.",
        "statusUpdate": "A professional status update suitable for a client or partner to read.",
        "actionItems": ["List of specific actions required based on this email"],
        "sentiment": "positive" | "neutral" | "negative"
    }
    
    Rules:
    1. Ignore email signatures, legal disclaimers, and extensive thread history if redundant.
    2. Focus on the most recent and critical information.
    3. If the email is just "FYI" or simple, reflect that.
    4. Do not include markdown formatting in the output, just raw JSON.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Clean markdown code blocks if present to ensure valid parsing
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonStr) as EmailAnalysis;
    } catch (error) {
        console.error('Error processing email with AI:', error);
        // Fallback
        return {
            summary: 'Failed to process email content.',
            statusUpdate: `Email received: ${subject}`,
            actionItems: ['Review original email'],
            sentiment: 'neutral'
        };
    }
}
