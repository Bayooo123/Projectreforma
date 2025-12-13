
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

export async function POST(request: Request): Promise<NextResponse> {
    try {
        await requireAuth();

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const workspaceId = formData.get('workspaceId') as string;

        if (!file || !workspaceId) {
            return NextResponse.json(
                { success: false, error: 'File and Workspace ID are required' },
                { status: 400 }
            );
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: 'Invalid file type. Only JPG, PNG, and PDF allowed.' },
                { status: 400 }
            );
        }

        const filename = `letterhead-${workspaceId}-${Date.now()}.${file.name.split('.').pop()}`;

        // Upload to Vercel Blob
        const blob = await put(filename, file, {
            access: 'public',
        });

        // Update Workspace with new URL
        await prisma.workspace.update({
            where: { id: workspaceId },
            data: { letterheadUrl: blob.url }
        });

        return NextResponse.json({ success: true, url: blob.url });

    } catch (error: any) {
        console.error('Error uploading letterhead:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to upload letterhead' },
            { status: 500 }
        );
    }
}
