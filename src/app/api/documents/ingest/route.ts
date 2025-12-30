
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { put } from '@vercel/blob';

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
            return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
        }

        // 1. Upload to Blob Storage
        const buffer = Buffer.from(await file.arrayBuffer());

        const blob = await put(file.name, buffer, {
            access: 'public',
        });

        const documentId = nanoid();

        // 2. Create document record
        await prisma.document.create({
            data: {
                id: documentId,
                name: file.name,
                type: file.type.split('/')[1] || 'unknown',
                size: file.size,
                url: blob.url,
                briefId: briefId,
                ocrStatus: 'pending'
            }
        });

        // 3. Try text extraction (optional - don't fail upload if this fails)
        let extractedText = '';
        try {
            const { TextExtractor } = await import('@/lib/ingestion/text-extractor');
            extractedText = await TextExtractor.extract(buffer, file.type);

            // Update document with extracted text
            await prisma.document.update({
                where: { id: documentId },
                data: {
                    ocrText: extractedText,
                    ocrStatus: 'completed'
                }
            });
        } catch (extractError) {
            console.warn('[Ingest] Text extraction failed (non-fatal):', extractError);
            // Mark as failed but don't rollback the upload
            await prisma.document.update({
                where: { id: documentId },
                data: { ocrStatus: 'failed' }
            });
        }

        // 4. Vectorization is skipped for now (requires pgvector + API key)
        // This can be enabled later when the full RAG pipeline is needed

        return NextResponse.json({
            success: true,
            documentId,
            url: blob.url,
            textExtracted: extractedText.length > 0
        });

    } catch (error) {
        console.error('[Ingest] Error:', error);
        return NextResponse.json({
            error: 'Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error')
        }, { status: 500 });
    }
}
