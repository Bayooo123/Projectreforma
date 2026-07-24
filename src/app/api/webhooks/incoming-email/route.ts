import { NextRequest, NextResponse } from 'next/server';
import {
    ingestInboundEmail,
    resolveWorkspaceByRecipient,
    type RawAttachment,
} from '@/lib/services/email-ingestion';

export async function POST(request: NextRequest) {
    console.log('📨 Institutional Memory: Incoming Email');

    try {
        const contentType = request.headers.get('content-type') || '';
        let recipient = '', sender = '', subject = '', body = '', messageId = '';
        let rawAttachments: RawAttachment[] = [];

        if (contentType.includes('application/json')) {
            const json = await request.json();
            recipient = json.OriginalRecipient || json.originalRecipient || json.to || json.To || '';
            sender    = json.from || json.From || '';
            subject   = json.subject || json.Subject || '';
            body      = json.text || json.TextBody || json.html || json.HtmlBody || '';
            messageId = json.MessageID || json['Message-ID'] || json.messageId || '';
            // Postmark: Attachments array with { Name, Content (base64), ContentType, ContentLength }
            const atts: Record<string, unknown>[] = json.Attachments || json.attachments || [];
            rawAttachments = atts.map((a) => ({
                name:          (a.Name          || a.name          || 'attachment') as string,
                content:       (a.Content       || a.content       || '') as string,
                contentType:   (a.ContentType   || a.contentType   || 'application/octet-stream') as string,
                contentLength: (a.ContentLength || a.contentLength || 0) as number,
            }));
        } else if (contentType.includes('multipart/form-data')) {
            const fd  = await request.formData();
            recipient = (fd.get('OriginalRecipient') || fd.get('to') || fd.get('To')) as string ?? '';
            sender    = (fd.get('from')      || fd.get('From'))       as string ?? '';
            subject   = (fd.get('subject')   || fd.get('Subject'))    as string ?? '';
            body      = ((fd.get('text')     || fd.get('TextBody'))   as string)
                     || ((fd.get('html')     || fd.get('HtmlBody'))   as string) || '';
            messageId = (fd.get('MessageID') || fd.get('Message-ID')) as string ?? '';
            // Multipart attachments are File objects
            const attachmentCount = parseInt(fd.get('attachments') as string || '0', 10);
            for (let i = 1; i <= attachmentCount; i++) {
                const file = fd.get(`attachment${i}`) as File | null;
                if (file) {
                    const ab = await file.arrayBuffer();
                    rawAttachments.push({
                        name:          file.name,
                        content:       Buffer.from(ab).toString('base64'),
                        contentType:   file.type || 'application/octet-stream',
                        contentLength: file.size,
                    });
                }
            }
        } else {
            return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
        }

        const senderEmailMatch = sender.match(/<(.+?)>/);
        const senderEmail = (senderEmailMatch ? senderEmailMatch[1] : sender).toLowerCase().trim();
        const senderName  = senderEmailMatch ? sender.replace(/<.+>/, '').trim() : undefined;

        const workspaceId = await resolveWorkspaceByRecipient(recipient);
        if (!workspaceId) {
            console.log(`📭 No workspace for recipient "${recipient}" — dropping`);
            return NextResponse.json({ received: true });
        }

        const result = await ingestInboundEmail({
            workspaceId,
            fromEmail: senderEmail,
            fromName: senderName,
            subject,
            body,
            messageId: messageId || undefined,
            recipientRaw: recipient,
            attachments: rawAttachments,
            source: 'incoming-email',
        });

        if (result.filtered) return NextResponse.json({ received: true, filtered: result.filtered });
        if (result.duplicate) return NextResponse.json({ received: true, duplicate: true });

        return NextResponse.json({
            success: true,
            brief: result.briefName,
            pulseEventId: result.pulseEventId,
            attachments: rawAttachments.length,
        });
    } catch (error) {
        console.error('Institutional Memory pipeline error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
