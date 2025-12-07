import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request): Promise<NextResponse> {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    const briefId = searchParams.get('briefId');

    if (!filename) {
        return NextResponse.json(
            { error: 'Filename is required' },
            { status: 400 }
        );
    }

    if (!request.body) {
        return NextResponse.json(
            { error: 'File body is required' },
            { status: 400 }
        );
    }

    try {
        // Get file size from request
        const buffer = await request.arrayBuffer();
        const fileSize = buffer.byteLength;

        // Upload to Vercel Blob
        const blob = await put(filename, buffer, {
            access: 'public',
        });

        // If briefId provided, create document record in database
        if (briefId) {
            await prisma.document.create({
                data: {
                    name: filename,
                    url: blob.url,
                    type: filename.split('.').pop() || 'unknown',
                    size: fileSize,
                    briefId: briefId,
                },
            });
        }

        return NextResponse.json(blob);
    } catch (error) {
        console.error('Error uploading blob:', error);
        return NextResponse.json(
            { error: 'Error uploading file' },
            { status: 500 }
        );
    }
}
