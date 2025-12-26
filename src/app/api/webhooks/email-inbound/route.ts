import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Secret token to verify the request comes from your mail provider
// Set this in your Vercel Environment Variables: EMAIL_WEBHOOK_SECRET
const WEBHOOK_SECRET = process.env.EMAIL_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
    // 1. Security Check
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('secret');

    // Allow testing if secret is not set yet, but warn in production
    if (WEBHOOK_SECRET && token !== WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 2. Parse FormData (Standard for Email Webhooks like SendGrid/Postmark)
        const formData = await req.formData();

        // Fields depend on provider (SendGrid used as example standard)
        // 'from': "Sender Name <sender@email.com>"
        // 'subject': "Re: Suit CV/2024/005"
        // 'text': "Email body..."
        const fromRaw = formData.get('from') as string || '';
        const subject = formData.get('subject') as string || '(No Subject)';
        const text = formData.get('text') as string || '';
        const html = formData.get('html') as string || '';

        // Extract clean email from "Name <email>" format
        const fromEmailMatch = fromRaw.match(/<(.+)>/);
        const fromEmail = fromEmailMatch ? fromEmailMatch[1] : fromRaw.trim();

        console.log(`[Email Webhook] Received mail from: ${fromEmail}`);

        // 3. Identify User
        const user = await prisma.user.findUnique({
            where: { email: fromEmail }
        });

        if (!user) {
            console.log(`[Email Webhook] User not found for email: ${fromEmail}`);
            return NextResponse.json({ message: 'User ignored' }, { status: 200 }); // 200 to stop retries
        }

        // 4. Identify Context (Matter / Brief)
        // Regex to find Case Numbers like "CV/2024/005" or "Suit No: FHC/L/..."
        // Simple regex for "CV/202X/XXX" style for now
        const matterRegex = /([A-Z]{2,}\/\d{4}\/\d{3,})/i;
        const match = subject.match(matterRegex);

        let matterId = null;

        if (match) {
            const caseNumber = match[1];
            // Try to find the matter
            const matter = await prisma.matter.findFirst({
                where: {
                    OR: [
                        { caseNumber: { contains: caseNumber, mode: 'insensitive' } },
                        { name: { contains: caseNumber, mode: 'insensitive' } }
                    ]
                }
            });
            if (matter) matterId = matter.id;
        }

        // 5. Log Activity
        if (matterId) {
            // Option A: Linked to Matter -> Log to Matter Activity
            await prisma.matterActivityLog.create({
                data: {
                    matterId: matterId,
                    activityType: 'email_correspondence',
                    description: `Emailed Client: ${subject}`,
                    performedBy: user.id
                }
            });

            // Also update 'lastActivityAt' on Matter
            await prisma.matter.update({
                where: { id: matterId },
                data: { lastActivityAt: new Date(), lastClientContact: new Date() }
            });

            console.log(`[Email Webhook] Logged activity for Matter ${matterId}`);

        } else {
            // Option B: Unlinked -> Create a generic "Task" or "Brief Activity"
            // For now, let's create a completed Task so it shows up in reports

            // First, find the user's primary workspace (fallback logic)
            const membership = await prisma.workspaceMember.findFirst({
                where: { userId: user.id }
            });

            if (membership) {
                await prisma.task.create({
                    data: {
                        title: `Email: ${subject}`,
                        description: text.substring(0, 500) + '...', // Truncate body
                        status: 'completed', // It's done
                        priority: 'medium',
                        source: 'email',
                        sourceEmail: fromEmail,
                        emailSubject: subject,
                        assignedToId: user.id,
                        assignedById: user.id, // Self-assigned via email
                        workspaceId: membership.workspaceId,
                        completedAt: new Date()
                    }
                });
                console.log(`[Email Webhook] Logged unlinked email as Task for User ${user.id}`);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[Email Webhook] Error processing email:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
