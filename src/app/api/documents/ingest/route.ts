
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import { assertWorkspaceMember } from '@/lib/workspace-guard';

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

        const brief = await prisma.brief.findUnique({ where: { id: briefId }, select: { workspaceId: true } });
        if (!brief) {
            return NextResponse.json({ error: 'Brief not found' }, { status: 404 });
        }
        try {
            await assertWorkspaceMember(brief.workspaceId);
        } catch {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
        }

        // 1. Upload to Blob Storage
        const buffer = Buffer.from(await file.arrayBuffer());

        const blob = await put(file.name, buffer, {
            access: 'public',
        });

        // 2. Process via Central Ingestion Service
        const { DocumentIngestionService } = await import('@/lib/services/ingestion');
        const result = await DocumentIngestionService.ingest({
            name: file.name,
            buffer,
            contentType: file.type,
            size: file.size,
            briefId,
            url: blob.url
        });

        return NextResponse.json({
            success: true,
            documentId: (result as any).documentId,
            url: blob.url,
            textExtracted: !(result as any).error
        });

    } catch (error) {
        console.error('[Ingest] Error:', error);
        return NextResponse.json({
            error: 'Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error')
        }, { status: 500 });
    }
}
