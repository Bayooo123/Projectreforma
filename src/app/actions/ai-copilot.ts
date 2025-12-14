'use server';

import { prisma } from '@/lib/prisma';
import { generateEmbedding, chunkText } from '@/lib/rag/embeddings';
import { requireAuth } from '@/lib/auth-utils';
import { unstable_noStore as noStore } from 'next/cache';

export async function processDocument(documentId: string) {
    await requireAuth();
    console.log('[AI Copilot] Processing document:', documentId);

    try {
        const doc = await prisma.document.findUnique({
            where: { id: documentId },
            select: { id: true, ocrText: true, briefId: true }
        });

        if (!doc) throw new Error('Document not found');
        if (!doc.ocrText) {
            console.log('[AI Copilot] No OCR text available yet. Skipping.');
            return { success: false, error: 'OCR text not ready' };
        }

        // 1. Chunk the text
        const chunks = chunkText(doc.ocrText);
        console.log(`[AI Copilot] Generated ${chunks.length} chunks`);

        // 2. Generate embeddings for each chunk
        let count = 0;
        for (const chunk of chunks) {
            const vector = await generateEmbedding(chunk);
            if (vector) {
                // 3. Store in DB
                // NOTE: We need to use raw SQL for vector insertion with Prisma + pgvector
                // Or if we enabled the typed extension, we might try typed usage.
                // For safety/compatibility with standard Prisma setup without specific generator extensions:

                await prisma.$executeRaw`
                    INSERT INTO "DocumentEmbedding" ("id", "documentId", "content", "embedding")
                    VALUES (gen_random_uuid(), ${documentId}, ${chunk}, ${vector}::vector)
                `;
                count++;
            }
        }

        console.log(`[AI Copilot] Successfully embedded ${count} chunks.`);
        return { success: true, chunksProcessed: count };

    } catch (error) {
        console.error('[AI Copilot] Error processing document:', error);
        return { success: false, error: 'Processing failed' };
    }
}

export async function searchBriefContext(briefId: string, query: string) {
    await requireAuth();
    noStore();

    try {
        const queryEmbedding = await generateEmbedding(query);
        if (!queryEmbedding) return { success: false, error: 'Failed to generate query embedding' };

        // Perform semantic search using cosine similarity
        // Retrieve top 5 matches related to this brief (via document relation)

        // Note: Using explicit casting for pgvector
        const results = await prisma.$queryRaw`
            SELECT 
                de.content,
                1 - (de.embedding <=> ${queryEmbedding}::vector) as similarity
            FROM "DocumentEmbedding" de
            JOIN "Document" d ON de."documentId" = d.id
            WHERE d."briefId" = ${briefId}
            ORDER BY de.embedding <=> ${queryEmbedding}::vector
            LIMIT 5;
        `;

        return { success: true, context: results };
    } catch (error) {
        console.error('[AI Copilot] Search failed:', error);
        return { success: false, error: 'Search failed' };
    }
}
