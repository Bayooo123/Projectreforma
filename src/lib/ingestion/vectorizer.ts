import { config } from '@/lib/config';

// Voyage AI — Anthropic's recommended embedding partner.
// Uses voyage-law-2, purpose-built for legal text (1024 dimensions).
// Set VOYAGE_API_KEY in your environment variables.
export class Vectorizer {

    static async embed(text: string): Promise<number[]> {
        const apiKey = config.VOYAGE_API_KEY;
        if (!apiKey) {
            throw new Error('VOYAGE_API_KEY is not configured. Voyage AI is required for document embeddings.');
        }

        const response = await fetch('https://api.voyageai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'voyage-law-2',
                input: [text],
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Voyage AI embedding failed: ${response.status} ${err}`);
        }

        const data = await response.json();
        return data.data[0].embedding as number[];
    }

    static async embedBatch(texts: string[]): Promise<number[][]> {
        const apiKey = config.VOYAGE_API_KEY;
        if (!apiKey) {
            throw new Error('VOYAGE_API_KEY is not configured.');
        }

        const response = await fetch('https://api.voyageai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'voyage-law-2',
                input: texts,
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Voyage AI batch embedding failed: ${response.status} ${err}`);
        }

        const data = await response.json();
        return (data.data as Array<{ embedding: number[] }>)
            .sort((a: any, b: any) => a.index - b.index)
            .map(d => d.embedding);
    }
}
