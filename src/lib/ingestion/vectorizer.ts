
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export class Vectorizer {

    /**
     * Generates an embedding vector for a given text.
     * Uses 'embedding-001' model.
     */
    static async embed(text: string): Promise<number[]> {
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            console.error("Missing GOOGLE_GENERATIVE_AI_API_KEY");
            // Return dummy vector for dev/test if key missing (Prevents crash, but useless for retrieval)
            // In prod this should throw.
            throw new Error("API Key for Embeddings not configured");
        }

        try {
            const model = genAI.getGenerativeModel({ model: "embedding-001" });
            const result = await model.embedContent(text);
            const embedding = result.embedding;
            return embedding.values;
        } catch (error) {
            console.error('[Vectorizer] Error generating embedding:', error);
            throw error;
        }
    }

    static async embedBatch(texts: string[]): Promise<number[][]> {
        // Prepare batch request logic if needed, for now sequential
        const vectors = [];
        for (const t of texts) {
            vectors.push(await this.embed(t));
        }
        return vectors;
    }
}
