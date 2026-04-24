
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';

const BICA_PLATFORM_ID = config.BICA_PLATFORM_ID;
const BICA_SHARED_SECRET = config.BICA_SHARED_SECRET;
const FLADOV_BASE_URL = config.FLADOV_BASE_URL;

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
        const workspaceId = session.user.workspaceId;

        if (!workspaceId) {
            return NextResponse.json(
                { status: 'failed', data: null, error: { code: 'NOT_FOUND', message: 'No active workspace found for this session.' } },
                { status: 404 }
            );
        }

        // 2. Fetch the workspace (platform entity) and the user's email for Fladov account linking
        const [workspace, user] = await Promise.all([
            prisma.workspace.findUnique({
                where: { id: workspaceId },
                select: { id: true, name: true, letterheadUrl: true },
            }),
            prisma.user.findUnique({
                where: { id: userId },
                select: { email: true },
            }),
        ]);

        if (!workspace) {
            return NextResponse.json(
                { status: 'failed', data: null, error: { code: 'NOT_FOUND', message: 'Workspace not found.' } },
                { status: 404 }
            );
        }

        if (!user?.email) {
            return NextResponse.json(
                { status: 'failed', data: null, error: { code: 'NOT_FOUND', message: 'User record not found.' } },
                { status: 404 }
            );
        }

        // 3. Build the Fladov session generation request body.
        //    The platform entity is the workspace (firm), not the individual user.
        //    `email` is the logged-in user's email — Fladov uses it for Shadow Identity account linking.
        //    `profile` describes the platform entity (workspace), not the user.
        const requestBody = {
            platform_entity_type: 'workspace',
            platform_entity_id: workspace.id,
            email: user.email,
            profile: {
                name: workspace.name,
                avatar_url: workspace.letterheadUrl || null,
            },
        };

        const rawPayload = JSON.stringify(requestBody);

        // 4. Sign the request body with HMAC-SHA256
        const signature = crypto
            .createHmac('sha256', BICA_SHARED_SECRET)
            .update(rawPayload)
            .digest('hex');

        // 5. Call Fladov's session generation endpoint
        //    Spec: POST https://fladov.com/api/v1/platforms/{platform_slug}/generate-session
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
        console.log('[BICA SESSIONS] entry_url from Fladov:', entryUrl);

        if (!entryUrl) {
            return NextResponse.json(
                { status: 'failed', data: null, error: { code: 'SESSION_GENERATION_FAILED', message: 'Fladov did not return an entry_url.' } },
                { status: 502 }
            );
        }

        // Guard against Fladov returning a sign-up / login page instead of a valid entry token.
        // This happens when BICA_SHARED_SECRET is wrong or the platform isn't registered.
        const authPaths = ['/signup', '/sign-up', '/register', '/login', '/auth', '/onboard', '/join'];
        try {
            const parsed = new URL(entryUrl);
            const lowerPath = parsed.pathname.toLowerCase();
            if (authPaths.some(p => lowerPath.startsWith(p))) {
                console.error('[BICA SESSIONS] Fladov returned an auth page URL — platform misconfigured:', entryUrl);
                return NextResponse.json(
                    {
                        status: 'failed',
                        data: null,
                        error: {
                            code: 'SESSION_GENERATION_FAILED',
                            message: 'Bica platform not configured correctly. Please contact your workspace administrator.',
                        },
                    },
                    { status: 502 }
                );
            }
        } catch {
            // If URL parsing fails, let it through — Fladov returned something unexpected but we'll surface that later
        }

        return NextResponse.json({
            status: 'success',
            data: { entry_url: entryUrl, token },
            error: null,
        });

    } catch (error: any) {
        console.error('[BICA SESSIONS]', error);

        const debugPayload = true // config.BICA_DEBUG_ERRORS
            ? {
                  message: error?.message ?? 'An unexpected error occurred.',
                  // ⚠️ SECURITY: BICA_DEBUG_ERRORS is ON — remove before production
                  _debug: {
                      stack: error?.stack ?? null,
                      cause: error?.cause ? String(error.cause) : null,
                      name: error?.name ?? null,
                  },
              }
            : { message: error?.message || 'An unexpected error occurred.' };

        return NextResponse.json(
            { status: 'failed', data: null, error: { code: 'SERVER_ERROR', ...debugPayload } },
            { status: 500 }
        );
    }
}
