
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { auth } from '@/auth';

const BICA_PLATFORM_ID = process.env.BICA_PLATFORM_ID || 'reforma_os';
const BICA_SHARED_SECRET = process.env.BICA_SHARED_SECRET || 'dev_secret_keys';
const FLADOV_BASE_URL = process.env.FLADOV_BASE_URL || 'https://fladov.app';

export async function POST(req: NextRequest) {
    try {
        // 1. Authenticate Request
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({
                status: 'failed',
                data: null,
                error: { code: 'UNAUTHORIZED', message: 'You must be logged in to generate a Bica session' }
            }, { status: 401 });
        }

        // 2. Validate Input
        const body = await req.json();
        const { external_user_id } = body;

        if (!external_user_id) {
            return NextResponse.json({
                status: 'failed',
                data: null,
                error: { code: 'VALIDATION_ERROR', message: 'external_user_id is required' }
            }, { status: 400 });
        }

        // Ensure user is only generating sessions for themselves
        if (external_user_id !== session.user.id) {
            return NextResponse.json({
                status: 'failed',
                data: null,
                error: { code: 'UNAUTHORIZED', message: 'User ID mismatch' }
            }, { status: 403 });
        }

        // 3. Prepare Request to Fladov
        const payload = {
            platform_id: BICA_PLATFORM_ID,
            external_user_id: external_user_id
        };
        const rawPayload = JSON.stringify(payload);

        // 4. Sign Request
        const signature = crypto
            .createHmac('sha256', BICA_SHARED_SECRET)
            .update(rawPayload)
            .digest('hex');

        // 5. Send Request to Fladov
        const response = await fetch(`${FLADOV_BASE_URL}/api/custom-platform/generate-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Custom-Platform-Signature': signature
            },
            body: rawPayload
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Fladov Session Error:', errorData);
            return NextResponse.json({
                status: 'failed',
                data: null,
                error: {
                    code: 'SESSION_GENERATION_FAILED',
                    message: errorData.error?.message || 'Unable to generate Bica session'
                }
            }, { status: 500 });
        }

        const data = await response.json();

        // 6. Return Token to Frontend
        return NextResponse.json({
            status: 'success',
            data: {
                magic_token: data.magic_token
            }
        });

    } catch (error: any) {
        console.error('Bica Session Generation Webhook Error:', error);
        return NextResponse.json({
            status: 'failed',
            data: null,
            error: {
                code: 'SERVER_ERROR',
                message: error.message || 'An unexpected error occurred'
            }
        }, { status: 500 });
    }
}
