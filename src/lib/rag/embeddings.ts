import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
// ERROR HANDLER: Ensure API key exists
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('CRITICAL: GEMINI_API_KEY is not set in environment variables.');
}

const genAI = new GoogleGenerativeAI(apiKey || '');
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

/**
 * Generates a vector embedding for a given text.
 * Uses Gemini's text-embedding-004 model.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
    try {
        if (!text || text.trim().length === 0) return null;

        // Clean text to avoid issues (remove null bytes, excessive whitespace)
        const cleanText = text.replace(/\0/g, '').trim();

        const result = await model.embedContent(cleanText);
        const embedding = result.embedding;
        return embedding.values;
    } catch (error) {
        console.error('Error generating embedding:', error);
        return null;
    }
}

/**
 * Chunks text into smaller segments for embedding.
 * Simple strategy: split by paragraphs, then combine to target size (approx 1000 chars).
 */
export function chunkText(text: string, maxChunkSize = 1000): string[] {
    if (!text) return [];

    const paragraphs = text.split(/\n\s*\n/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
        if ((currentChunk.length + paragraph.length) > maxChunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = '';
        }
        currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + paragraph;
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}
