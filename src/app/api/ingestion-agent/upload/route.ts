import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

// Endpoint the local document-onboarding agent talks to. Authenticated by an
// IngestionSession bearer token (not a logged-in user session) — see
// src/app/actions/ingestion-agent.ts for how the token is issued.
//
// Scope boundary: this route only stores the uploaded file as a pending
// IngestionCandidate. It does NOT run classification or file the document
// against a Brief — that's a separate, deferred job that reads the
// IngestionCandidate table and reuses DocumentIngestionService.

const MAX_SIZE = 25 * 1024 * 1024; // 25MB — scans/bundles from a firm's local files can run larger than typical web uploads
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'ppt', 'pptx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'tif', 'tiff'];

function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
        if (!token) {
            return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
        }

        const session = await prisma.ingestionSession.findUnique({
            where: { tokenHash: hashToken(token) },
        });

        if (!session || session.status !== 'active') {
            return NextResponse.json({ error: 'Invalid or revoked ingestion session' }, { status: 401 });
        }
        if (session.expiresAt < new Date()) {
            return NextResponse.json({ error: 'Ingestion session expired' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const sourcePath = formData.get('sourcePath') as string | null;

        if (!file || !sourcePath) {
            return NextResponse.json({ error: 'file and sourcePath are required' }, { status: 400 });
        }
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 400 });
        }

        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
            return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const checksum = createHash('sha256').update(buffer).digest('hex');

        const blob = await put(file.name, buffer, { access: 'public' });

        const candidate = await prisma.ingestionCandidate.create({
            data: {
                sessionId: session.id,
                workspaceId: session.workspaceId,
                sourcePath,
                fileName: file.name,
                contentType: file.type || 'application/octet-stream',
                size: file.size,
                blobUrl: blob.url,
                checksum,
            },
        });

        await prisma.ingestionSession.update({
            where: { id: session.id },
            data: { lastUsedAt: new Date() },
        });

        return NextResponse.json({
            success: true,
            candidateId: candidate.id,
            status: candidate.status,
        });
    } catch (error) {
        console.error('[IngestionAgent Upload] Error:', error);
        return NextResponse.json({
            error: 'Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
        }, { status: 500 });
    }
}
