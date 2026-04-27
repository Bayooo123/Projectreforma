import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';

interface PostmarkAttachment {
    Name: string;
    Content: string;
    ContentType: string;
    ContentLength?: number;
}

interface PostmarkInboundPayload {
    From: string;
    FromFull?: { Email: string; Name: string };
    To: string;
    Subject: string;
    TextBody?: string;
    HtmlBody?: string;
    Attachments?: PostmarkAttachment[];
}

export async function POST(req: NextRequest) {
    // Validate secret token from URL param
    const { searchParams } = new URL(req.url);
    if (searchParams.get('token') !== process.env.EMAIL_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    let payload: PostmarkInboundPayload;
    try {
        payload = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const fromEmail = (payload.FromFull?.Email ?? payload.From.match(/<(.+)>/)?.[1] ?? payload.From).toLowerCase();
    const fromName = payload.FromFull?.Name ?? payload.From.split('<')[0].trim();
    const subject = payload.Subject ?? '(no subject)';
    const body = payload.TextBody ?? '';
    const attachments = payload.Attachments ?? [];

    // 1. Match sender to a known client
    const client = await prisma.client.findFirst({
        where: { email: { equals: fromEmail, mode: 'insensitive' } },
        select: { id: true, workspaceId: true },
    });

    // 2. Try to match subject line to a matter name
    let matter: { id: string; workspaceId: string } | null = null;
    const cleanSubject = subject.replace(/^(Re|Fwd?):\s*/gi, '').trim();
    if (client && cleanSubject.length > 3) {
        matter = await prisma.matter.findFirst({
            where: {
                workspaceId: client.workspaceId,
                name: { contains: cleanSubject, mode: 'insensitive' },
            },
            select: { id: true, workspaceId: true },
        });
    }

    const workspaceId = client?.workspaceId ?? null;

    // 3. Store the inbound email record
    const emailRecord = await prisma.inboundEmail.create({
        data: {
            fromEmail,
            fromName: fromName || null,
            subject,
            bodyPreview: body.slice(0, 500) || null,
            attachmentCount: attachments.length,
            attachmentNames: attachments.map(a => a.Name).join(', ') || null,
            workspaceId,
            clientId: client?.id ?? null,
            matterId: matter?.id ?? null,
        },
    });

    // 4. Update matter activity timestamps if matched
    if (matter) {
        await prisma.matter.update({
            where: { id: matter.id },
            data: {
                lastClientContact: new Date(),
                lastActivityAt: new Date(),
            },
        });
    }

    // 5. Store attachments
    if (attachments.length > 0 && matter) {
        const brief = await prisma.brief.findFirst({
            where: { matterId: matter.id },
            select: { id: true },
            orderBy: { createdAt: 'desc' },
        });

        if (brief) {
            for (const attachment of attachments) {
                if (!attachment.Content) continue;
                try {
                    const buffer = Buffer.from(attachment.Content, 'base64');
                    const blob = await put(
                        `inbound/${emailRecord.id}/${attachment.Name}`,
                        buffer,
                        { access: 'public', contentType: attachment.ContentType }
                    );
                    await prisma.document.create({
                        data: {
                            name: attachment.Name,
                            url: blob.url,
                            type: attachment.ContentType,
                            size: attachment.ContentLength ?? buffer.length,
                            briefId: brief.id,
                        },
                    });
                } catch (err) {
                    console.error('[Email inbound] Attachment upload failed:', attachment.Name, err);
                }
            }
        }
    }

    console.log(`[Email inbound] Processed: from=${fromEmail} subject="${subject}" matched=${!!matter} attachments=${attachments.length}`);
    return NextResponse.json({ ok: true, id: emailRecord.id });
}
