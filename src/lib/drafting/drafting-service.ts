import { prisma } from '@/lib/prisma';
import { Vectorizer } from '@/lib/ingestion/vectorizer';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPTS } from './prompts';
import { config } from '@/lib/config';

export class DraftingService {

    static async retrieveContext(briefId: string, query: string, limit = 10): Promise<string> {
        const queryVector = await Vectorizer.embed(query);
        const vectorString = `[${queryVector.join(',')}]`;

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

        return chunks.map((c, i) => `\n[Fact ${i + 1}]\n${c.content}\n`).join('\n');
    }

    static async generateDraft(briefId: string, instruction: string): Promise<string> {
        const apiKey = config.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured.');

        console.log(`[DraftingService] Retrieving context for: "${instruction}"`);
        const context = await this.retrieveContext(briefId, instruction);

        let prompt = SYSTEM_PROMPTS.SENIOR_ASSOCIATE + '\n\n' + SYSTEM_PROMPTS.FRESH_DRAFT_INSTRUCTION;
        prompt = prompt.replace('{{CONTEXT}}', context || 'No specific documents found in Brief.');
        prompt = prompt.replace('{{INSTRUCTION}}', instruction);

        console.log('[DraftingService] Generating draft…');

        const client = new Anthropic({ apiKey });
        const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt }],
        });

        const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
        if (!text) throw new Error('No draft returned from Claude.');
        return text;
    }
}
