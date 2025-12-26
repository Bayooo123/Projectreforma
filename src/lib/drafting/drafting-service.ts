
import { prisma } from '@/lib/prisma';
import { Vectorizer } from '@/lib/ingestion/vectorizer';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_PROMPTS } from './prompts';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export class DraftingService {

    /**
     * Retrieves the most relevant document chunks for a given query within a Brief.
     */
    static async retrieveContext(briefId: string, query: string, limit = 10): Promise<string> {
        // 1. Vectorize the query
        const queryVector = await Vectorizer.embed(query);

        // 2. Perform Cosine Similarity Search via Raw SQL (pgvector)
        // We cast the vector array to a string representation for SQL
        const vectorString = `[${queryVector.join(',')}]`;

        /* 
           Prisma doesn't support vector comparisons in `findMany` yet.
           We must use $queryRaw.
           
           Query explanation:
           - Join DocumentChunk with Document to filter by briefId
           - Calculate distance using <=> (cosine distance operator) or <-> (Euclidean)
           - Order by distance ASC (closest first)
        */
        const chunks = await prisma.$queryRaw`
            SELECT 
                chunk.content,
                chunk.metadata,
                (chunk.embedding <=> ${vectorString}::vector) as distance
            FROM "DocumentChunk" AS chunk
            JOIN "Document" AS doc ON chunk."documentId" = doc.id
            WHERE doc."briefId" = ${briefId}
            ORDER BY distance ASC
            LIMIT ${limit};
        ` as any[];

        // 3. Format context string
        const contextString = chunks.map((c, i) => `
[Fact ${i + 1}]
${c.content}
`).join('\n');

        return contextString;
    }

    /**
     * Generates a draft based on the session state and user instruction.
     */
    static async generateDraft(briefId: string, instruction: string): Promise<string> {
        try {
            // 1. Retrieve Context
            console.log(`[DraftingService] Retrieving context for: "${instruction}"`);
            const context = await this.retrieveContext(briefId, instruction);

            // 2. Construct Prompt
            let prompt = SYSTEM_PROMPTS.SENIOR_ASSOCIATE + "\n\n" + SYSTEM_PROMPTS.FRESH_DRAFT_INSTRUCTION;
            prompt = prompt.replace('{{CONTEXT}}', context || "No specific documents found in Brief.");
            prompt = prompt.replace('{{INSTRUCTION}}', instruction);

            // 3. Call LLM (Gemini Pro)
            console.log(`[DraftingService] Generating draft...`);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return text;

        } catch (error) {
            console.error('[DraftingService] Error generating draft:', error);
            throw new Error(`Failed to generate draft: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
