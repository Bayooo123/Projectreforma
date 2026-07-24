import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ingestInboundEmail, type RawAttachment } from '@/lib/services/email-ingestion';

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
    MessageID?: string;
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
    const attachments: RawAttachment[] = (payload.Attachments ?? []).map(a => ({
        name: a.Name,
        content: a.Content,
        contentType: a.ContentType,
        contentLength: a.ContentLength ?? 0,
    }));

    // This integration's own routing strategy: match the sender to a known
    // client, then try to match the subject line to that client's matter name.
    // Kept distinct from the other two email integrations (which route by
    // recipient alias / AI content matching) since it's a legitimately
    // different, valid way for a differently-configured inbox to route mail —
    // only the downstream record-creation (PulseEvent, activity log, and
    // attachment ingestion) is shared, via knownBriefId.
    const client = await prisma.client.findFirst({
        where: { email: { equals: fromEmail, mode: 'insensitive' } },
        select: { id: true, workspaceId: true },
    });

    let matter: { id: string; workspaceId: string } | null = null;
    const cleanSubject = subject.replace(/^(Re|Fwd?):\s*/gi, '').trim();
    if (client && cleanSubject.length > 3) {
        matter = await prisma.matter.findFirst({
            where: { workspaceId: client.workspaceId, name: { contains: cleanSubject, mode: 'insensitive' } },
            select: { id: true, workspaceId: true },
        });
    }

    if (!client) {
        // No way to attribute this to a workspace at all — log it standalone,
        // same as before, rather than guessing.
        const emailRecord = await prisma.inboundEmail.create({
            data: {
                fromEmail, fromName: fromName || null, subject,
                bodyPreview: body.slice(0, 500) || null,
                attachmentCount: attachments.length,
                attachmentNames: attachments.map(a => a.name).join(', ') || null,
            },
        });
        console.log(`[Email inbound] Unmatched sender, logged standalone: ${fromEmail}`);
        return NextResponse.json({ ok: true, id: emailRecord.id });
    }

    if (matter) {
        await prisma.matter.update({
            where: { id: matter.id },
            data: { lastClientContact: new Date(), lastActivityAt: new Date() },
        });
    }

    const brief = matter
        ? await prisma.brief.findFirst({ where: { matterId: matter.id }, select: { id: true }, orderBy: { createdAt: 'desc' } })
        : null;

    const result = await ingestInboundEmail({
        workspaceId: client.workspaceId,
        fromEmail,
        fromName: fromName || undefined,
        subject,
        body,
        messageId: payload.MessageID || undefined,
        knownBriefId: brief?.id,
        attachments,
        source: 'email-inbound',
    });

    console.log(`[Email inbound] Processed: from=${fromEmail} subject="${subject}" matched=${!!brief} attachments=${attachments.length}`);

    if (result.filtered) return NextResponse.json({ ok: true, filtered: result.filtered });
    if (result.duplicate) return NextResponse.json({ ok: true, duplicate: true });
    return NextResponse.json({ ok: true, id: result.inboundEmailId, brief: result.briefName });
}
