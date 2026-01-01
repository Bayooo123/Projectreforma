import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';

export async function POST(request: Request): Promise<NextResponse> {
    const body = (await request.json()) as HandleUploadBody;

    try {
        const user = await requireAuth();

        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname) => {
                // Authenticated users can upload
                // We can check permissions here, e.g. if user belongs to workspace
                return {
                    allowedContentTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'],
                    tokenPayload: JSON.stringify({
                        uploadedBy: user.id,
                        workspaceId: user.workspaceId
                    }),
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                // This runs via webhook after upload completes
                console.log('Upload completed:', blob.url);
                try {
                    // Optional: We could create the DB record here using the tokenPayload
                    // But we currently do it in the client for simplicity/feedback speed
                    // However, doing it here is more robust. 
                    // For now, we'll keep the client logic to update the UI
                } catch (error) {
                    console.error('Error in onUploadCompleted:', error);
                }
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 400 },
        );
    }
}
