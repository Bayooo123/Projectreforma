
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const BICA_PLATFORM_ID = process.env.BICA_PLATFORM_ID || 'reforma_os';
const BICA_SHARED_SECRET = process.env.BICA_SHARED_SECRET || 'dev_secret_keys';
const FLADOV_BASE_URL = process.env.FLADOV_BASE_URL || 'https://fladov.app';

/**
 * POST /api/bica/sessions
 *
 * Called by the Reforma frontend when rendering the Bica iframe.
 * Requests a short-lived Magic Entry Token from Fladov on behalf of
 * the current authenticated user and returns the entry_url.
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Require an authenticated Reforma session
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { status: 'failed', data: null, error: { code: 'UNAUTHORIZED', message: 'You must be logged in to generate a Bica session.' } },
                { status: 401 }
            );
        }

        const userId = session.user.id;

        // 2. Fetch full user profile (we need email + display name for the handshake)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, image: true },
        });

        if (!user || !user.email) {
            return NextResponse.json(
                { status: 'failed', data: null, error: { code: 'NOT_FOUND', message: 'User record not found.' } },
                { status: 404 }
            );
        }

        // 3. Build the Fladov session generation request body
        //    Spec: platform_entity_type, platform_entity_id, email, profile
        const requestBody = {
            platform_entity_type: 'App\\Models\\User',  // Morph class identifier per spec
            platform_entity_id: user.id,
            email: user.email,
            profile: {
                name: user.name || user.email,
                avatar_url: user.image || null,
            },
        };

        const rawPayload = JSON.stringify(requestBody);

        // 4. Sign the request body with HMAC-SHA256
        const signature = crypto
            .createHmac('sha256', BICA_SHARED_SECRET)
            .update(rawPayload)
            .digest('hex');

        // 5. Call Fladov's session generation endpoint
        //    Spec: POST https://fladov.app/api/v1/platforms/{platform_slug}/generate-session
        const fladovUrl = `${FLADOV_BASE_URL}/api/v1/platforms/${BICA_PLATFORM_ID}/generate-session`;

        const response = await fetch(fladovUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Custom-Platform-Signature': signature,
            },
            body: rawPayload,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[BICA SESSIONS] Fladov error:', errorData);
            return NextResponse.json(
                {
                    status: 'failed',
                    data: null,
                    error: {
                        code: 'SESSION_GENERATION_FAILED',
                        message: errorData?.error?.message || 'Unable to generate Bica session from Fladov.',
                    },
                },
                { status: 502 }
            );
        }

        // 6. Fladov returns: { token, entry_url }
        const data = await response.json();
        const entryUrl: string | undefined = data.entry_url;
        const token: string | undefined = data.token;

        if (!entryUrl) {
            return NextResponse.json(
                { status: 'failed', data: null, error: { code: 'SESSION_GENERATION_FAILED', message: 'Fladov did not return an entry_url.' } },
                { status: 502 }
            );
        }

        return NextResponse.json({
            status: 'success',
            data: { entry_url: entryUrl, token },
            error: null,
        });

    } catch (error: any) {
        console.error('[BICA SESSIONS]', error);
        return NextResponse.json(
            { status: 'failed', data: null, error: { code: 'SERVER_ERROR', message: error.message || 'An unexpected error occurred.' } },
            { status: 500 }
        );
    }
}
