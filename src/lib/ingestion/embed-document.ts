import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { config } from '@/lib/config';
import { Vectorizer } from './vectorizer';

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;
// Guards against embedding an unbounded number of chunks (and racking up
// Voyage API cost) on an unusually large document — 60 chunks already
// covers roughly 80-90 pages of dense text.
const MAX_CHUNKS = 60;

function chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length && chunks.length < MAX_CHUNKS) {
        const end = Math.min(start + CHUNK_SIZE, text.length);
        const slice = text.slice(start, end).trim();
        if (slice) chunks.push(slice);
        if (end === text.length) break;
        start = end - CHUNK_OVERLAP;
    }
    return chunks;
}

// Populates DocumentChunk with embedded text chunks so semantic document
// search (DraftingService.retrieveContext, used by drafting and by the
// WhatsApp agent's search_brief_documents tool) has something to find.
// Without this step the table stays empty forever and every semantic
// search silently returns "no matches" — indistinguishable from a genuine
// no-hit, which is exactly what was happening before this existed. Runs
// fire-and-forget from ingestion, same as timeline extraction, so a slow
// or failed embedding call never blocks the upload response.
export async function embedDocument(documentId: string, text: string | null): Promise<void> {
    if (!config.VOYAGE_API_KEY || !text?.trim()) return;

    const chunks = chunkText(text);
    if (chunks.length === 0) return;

    try {
        const embeddings = await Vectorizer.embedBatch(chunks);
        for (let i = 0; i < chunks.length; i++) {
            const vectorString = `[${embeddings[i].join(',')}]`;
            await prisma.$executeRaw`
                INSERT INTO "DocumentChunk" (id, "documentId", content, embedding, "chunkIndex")
                VALUES (${nanoid()}, ${documentId}, ${chunks[i]}, ${vectorString}::vector, ${i})
            `;
        }
    } catch (err) {
        console.error(`[embedDocument] Failed to embed document ${documentId}:`, err);
    }
}
