import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

export async function POST(request: Request): Promise<NextResponse> {
    try {
        // 1. Security: Auth Check
        await requireAuth();

        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');
        const briefId = searchParams.get('briefId');

        if (!filename || !briefId) {
            return NextResponse.json(
                { error: 'Filename and Brief ID are required' },
                { status: 400 }
            );
        }

        // 2. Security: File Type Validation
        const allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx'];
        const extension = filename.split('.').pop()?.toLowerCase();

        if (!extension || !allowedExtensions.includes(extension)) {
            return NextResponse.json(
                { error: 'Invalid file type. Allowed: PDF, DOC, DOCX, PPT, PPTX, TXT' },
                { status: 400 }
            );
        }

        if (!request.body) {
            return NextResponse.json(
                { error: 'File body is required' },
                { status: 400 }
            );
        }

        // 3. Performance: Stream Upload (Fixes OOM crash on large files)
        const blob = await put(filename, request.body, {
            access: 'public',
        });

        // 4. Database Record
        await prisma.document.create({
            data: {
                name: filename,
                url: blob.url,
                type: extension,
                size: parseInt(request.headers.get('content-length') || '0'), // Vercel Blob put result doesn't explicitly guarantee size in type
                briefId: briefId,
            },
        });

        return NextResponse.json(blob);
    } catch (error: any) {
        console.error('Error uploading blob:', error);

        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json(
            { error: 'Error uploading file' },
            { status: 500 }
        );
    }
}
