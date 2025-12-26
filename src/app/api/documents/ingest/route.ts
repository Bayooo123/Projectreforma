
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TextExtractor } from '@/lib/ingestion/text-extractor';
import { Chunker } from '@/lib/ingestion/chunker';
import { Vectorizer } from '@/lib/ingestion/vectorizer';
import { nanoid } from 'nanoid';

// Max file size 10MB
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const briefId = formData.get('briefId') as string;

        if (!file || !briefId) {
            return NextResponse.json({ error: 'File and Brief ID required' }, { status: 400 });
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large' }, { status: 400 });
        }

        // 1. Create Document Record (Placeholder for Blob Storage URL)
        // In a real app, upload to Vercel Alob/S3 here first.
        // For now, we simulate storage and proceed to processing.
        const buffer = Buffer.from(await file.arrayBuffer());
        const documentId = nanoid();

        // Transaction to ensure document exists before chunks
        await prisma.document.create({
            data: {
                id: documentId,
                name: file.name,
                type: file.type.split('/')[1] || 'unknown',
                size: file.size,
                url: `https://placeholder.storage/${file.name}`, // Placeholder
                briefId: briefId,
                ocrStatus: 'processing'
            }
        });

        // 2. Extract Text
        console.log(`[Ingest] Extracting text from ${file.name}...`);
        const text = await TextExtractor.extract(buffer, file.type);

        // Update Document with raw text (optional, acting as cache)
        await prisma.document.update({
            where: { id: documentId },
            data: { ocrText: text }
        });

        // 3. Chunk
        console.log(`[Ingest] Chunking text...`);
        const chunks = Chunker.chunk(text);
        console.log(`[Ingest] Generated ${chunks.length} chunks.`);

        // 4. Vectorize & Save
        console.log(`[Ingest] Vectorizing and saving chunks...`);

        for (let i = 0; i < chunks.length; i++) {
            const chunkText = chunks[i];
            const vector = await Vectorizer.embed(chunkText);

            // Raw SQL insert for pgvector
            // Note: We cast the vector array to string representation "[0.1, 0.2, ...]" and cast to ::vector
            const vectorString = `[${vector.join(',')}]`;

            await prisma.$executeRaw`
                INSERT INTO "DocumentChunk" ("id", "documentId", "content", "embedding", "chunkIndex", "metadata")
                VALUES (${nanoid()}, ${documentId}, ${chunkText}, ${vectorString}::vector, ${i}, ${JSON.stringify({ page: 1 })})
            `;
        }

        // 5. Mark Complete
        await prisma.document.update({
            where: { id: documentId },
            data: { ocrStatus: 'completed' }
        });

        return NextResponse.json({ success: true, documentId, chunks: chunks.length });

    } catch (error) {
        console.error('[Ingest] Error:', error);
        return NextResponse.json({ error: 'Ingestion failed: ' + (error instanceof Error ? error.message : 'Unknown') }, { status: 500 });
    }
}
