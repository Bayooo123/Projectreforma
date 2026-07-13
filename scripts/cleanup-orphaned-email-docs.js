/**
 * Removes Document records that were ingested from email attachments into briefs
 * the email is no longer linked to.
 *
 * Run with: node scripts/cleanup-orphaned-email-docs.js
 * Add --dry-run to preview without deleting.
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

async function main() {
    console.log(DRY_RUN ? '🔍 DRY RUN — no deletions will happen\n' : '🗑  LIVE RUN — orphaned documents will be deleted\n');

    // 1. All email attachments: url → emailId
    const allAttachments = await prisma.emailAttachment.findMany({
        select: { url: true, inboundEmailId: true },
    });

    if (allAttachments.length === 0) {
        console.log('No email attachments found. Nothing to do.');
        return;
    }

    const attachmentUrls = [...new Set(allAttachments.map(a => a.url))];
    console.log(`Found ${allAttachments.length} email attachment record(s) (${attachmentUrls.length} unique URLs).`);

    // url → set of emailIds that produced it
    const urlToEmailIds = new Map();
    for (const att of allAttachments) {
        if (!urlToEmailIds.has(att.url)) urlToEmailIds.set(att.url, new Set());
        urlToEmailIds.get(att.url).add(att.inboundEmailId);
    }

    // 2. Find Documents matching those URLs — query in chunks to avoid Prisma arg-size limits
    const emailSourcedDocs = [];
    for (const batch of chunk(attachmentUrls, 100)) {
        const docs = await prisma.document.findMany({
            where: { url: { in: batch } },
            select: { id: true, name: true, url: true, briefId: true },
        });
        emailSourcedDocs.push(...docs.filter(d => d.briefId !== null));
    }

    if (emailSourcedDocs.length === 0) {
        console.log('No email-sourced documents found in brief vaults. Database is clean.');
        return;
    }

    console.log(`Found ${emailSourcedDocs.length} email-sourced document(s) across brief vaults.`);

    // 3. Current PulseEvent briefId for each email (in chunks)
    const allEmailIds = [...new Set(allAttachments.map(a => a.inboundEmailId))];
    const emailToBriefId = new Map();
    for (const batch of chunk(allEmailIds, 100)) {
        const events = await prisma.pulseEvent.findMany({
            where: { inboundEmailId: { in: batch } },
            select: { inboundEmailId: true, briefId: true },
        });
        for (const pe of events) {
            if (pe.inboundEmailId) emailToBriefId.set(pe.inboundEmailId, pe.briefId);
        }
    }

    // 4. Identify orphans — docs in a brief the email is no longer linked to
    const toDelete = [];
    for (const doc of emailSourcedDocs) {
        const emailIds = urlToEmailIds.get(doc.url);
        if (!emailIds) continue;

        const belongsHere = [...emailIds].some(
            emailId => emailToBriefId.get(emailId) === doc.briefId
        );

        if (!belongsHere) {
            toDelete.push(doc);
            console.log(`  ORPHAN: "${doc.name}" in brief ${doc.briefId}`);
        }
    }

    if (toDelete.length === 0) {
        console.log('\nNo orphaned documents found. Database is already clean.');
        return;
    }

    console.log(`\n${DRY_RUN ? 'Would delete' : 'Deleting'} ${toDelete.length} orphaned document(s)...`);

    if (!DRY_RUN) {
        const ids = toDelete.map(d => d.id);
        let deleted = 0;
        for (const batch of chunk(ids, 100)) {
            const { count } = await prisma.document.deleteMany({ where: { id: { in: batch } } });
            deleted += count;
        }
        console.log(`✅ Deleted ${deleted} document(s).`);
    } else {
        console.log('(dry run — run without --dry-run to apply)');
    }
}

main()
    .catch(err => { console.error(err); process.exit(1); })
    .finally(() => prisma.$disconnect());
