// Diagnostic, read-only: shows exactly when email ingestion last actually
// succeeded, and the current state of the ascolp@reforma.ng inbound config —
// answers "when did this actually stop" precisely, instead of guessing from
// a code history alone. Changes nothing.
//
// Run with: npx tsx scripts/diagnose-email-ingestion.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const recentEmails = await prisma.inboundEmail.findMany({
        orderBy: { receivedAt: 'desc' },
        take: 15,
        select: { receivedAt: true, fromEmail: true, subject: true, attachmentCount: true, workspaceId: true },
    });

    console.log('Most recent inbound emails that actually entered Reforma (any source):\n');
    if (recentEmails.length === 0) {
        console.log('  None found — no email has ever entered Reforma via any ingestion path.');
    } else {
        for (const e of recentEmails) {
            console.log(`  ${e.receivedAt.toISOString()} — from ${e.fromEmail} — "${e.subject}"${e.attachmentCount ? ` (${e.attachmentCount} attachment(s))` : ''}`);
        }
    }

    const webhookHits = await prisma.workspaceActivityLog.findMany({
        where: { resource: 'EMAIL_WEBHOOK', action: 'zoho_hit' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { createdAt: true, resourceName: true, metadata: true },
    });
    console.log('\nMost recent times Zoho actually called the zoho-email webhook (regardless of whether ingestion succeeded):');
    if (webhookHits.length === 0) {
        console.log('  None recorded — either Zoho has not called this URL since this logging was added, or it never has.');
    } else {
        for (const h of webhookHits) {
            const from = (h.metadata as { from?: string } | null)?.from ?? 'unknown sender';
            console.log(`  ${h.createdAt.toISOString()} — from ${from} — "${h.resourceName}"`);
        }
    }

    console.log('\nascolp@reforma.ng inbound config:');
    const emailConfig = await prisma.workspaceEmailConfig.findFirst({
        where: { emailAddress: { equals: 'ascolp@reforma.ng', mode: 'insensitive' } },
    });
    if (!emailConfig) {
        console.log('  No WorkspaceEmailConfig row exists for this address at all.');
    } else {
        console.log(`  isActive: ${emailConfig.isActive}`);
        console.log(`  emailAddress (exact stored value): "${emailConfig.emailAddress}"`);
        console.log(`  emailIntegration (IMAP sync cursor, if the IMAP path has ever run): ${JSON.stringify(emailConfig.emailIntegration)}`);
        console.log(`  created: ${emailConfig.createdAt.toISOString()}, last updated: ${emailConfig.updatedAt.toISOString()}`);
    }
}

main()
    .catch(err => console.error('Error:', err))
    .finally(() => prisma.$disconnect());
