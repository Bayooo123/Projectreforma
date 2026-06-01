/**
 * scripts/relink-emails.ts
 *
 * Re-runs brief/matter matching on all unlinked InboundEmails for a workspace.
 * Run with:  npx tsx scripts/relink-emails.ts
 */

import { PrismaClient } from '@prisma/client';
import { identifyBriefFromContent, BriefCandidate, MatterCandidate } from '../src/lib/services/email-processor';

const prisma = new PrismaClient();
const WORKSPACE_ID = 'cmle84eye0002r9dbovl388l8'; // ASCOLP
const CONFIDENCE_THRESHOLD = 0.5;
const CONCURRENCY = 3;

async function main() {
    // Fetch all unlinked emails for this workspace
    const emails = await prisma.inboundEmail.findMany({
        where: {
            workspaceId: WORKSPACE_ID,
            matterId: null,
            clientId: null,
        },
        select: { id: true, subject: true, body: true, fromEmail: true, receivedAt: true },
        orderBy: { receivedAt: 'desc' },
    });

    console.log(`Found ${emails.length} unlinked emails to re-process\n`);

    // Fetch candidates once — same list for all emails
    const [briefCandidates, matterCandidates] = await Promise.all([
        prisma.brief.findMany({
            where: { workspaceId: WORKSPACE_ID, deletedAt: null },
            select: { id: true, name: true, briefNumber: true, client: { select: { name: true } } },
        }),
        prisma.matter.findMany({
            where: { workspaceId: WORKSPACE_ID, deletedAt: null },
            select: { id: true, name: true, caseNumber: true, status: true },
        }),
    ]);

    const briefList: BriefCandidate[] = briefCandidates.map(b => ({
        id: b.id, name: b.name, briefNumber: b.briefNumber,
        clientName: b.client?.name || 'No Client',
    }));

    const matterList: MatterCandidate[] = matterCandidates.map(m => ({
        id: m.id, name: m.name, caseNumber: m.caseNumber, status: m.status,
    }));

    console.log(`Matching against ${briefList.length} briefs + ${matterList.length} matters\n`);

    let linked = 0, skipped = 0, errors = 0;

    // Process in batches
    for (let i = 0; i < emails.length; i += CONCURRENCY) {
        const batch = emails.slice(i, i + CONCURRENCY);

        await Promise.all(batch.map(async email => {
            try {
                const subject = email.subject || '';
                const body = email.body || '';

                const result = await identifyBriefFromContent(subject, body, briefList, matterList);

                if (result.confidence < CONFIDENCE_THRESHOLD || (!result.briefId && !result.matterId)) {
                    console.log(`  ✗ [${i + batch.indexOf(email) + 1}/${emails.length}] "${subject.slice(0, 60)}" — no match (${Math.round(result.confidence * 100)}%)`);
                    skipped++;
                    return;
                }

                const pct = Math.round(result.confidence * 100);

                if (result.briefId) {
                    const brief = await prisma.brief.findFirst({
                        where: { id: result.briefId, workspaceId: WORKSPACE_ID },
                        select: { id: true, name: true, matterId: true },
                    });
                    if (brief) {
                        await prisma.inboundEmail.update({
                            where: { id: email.id },
                            data: {
                                briefId: brief.id,
                                ...(brief.matterId ? { matterId: brief.matterId } : {}),
                            },
                        });
                        // Update any PulseEvents for this email too
                        await prisma.pulseEvent.updateMany({
                            where: { inboundEmailId: email.id },
                            data: { briefId: brief.id, ...(brief.matterId ? { matterId: brief.matterId } : {}) },
                        });
                        console.log(`  ✓ [${i + batch.indexOf(email) + 1}/${emails.length}] "${subject.slice(0, 55)}" → BRIEF: ${brief.name} (${pct}%)`);
                        linked++;
                    }
                } else if (result.matterId) {
                    const matter = await prisma.matter.findFirst({
                        where: { id: result.matterId, workspaceId: WORKSPACE_ID },
                        select: { id: true, name: true },
                    });
                    if (matter) {
                        await prisma.inboundEmail.update({
                            where: { id: email.id },
                            data: { matterId: matter.id },
                        });
                        await prisma.pulseEvent.updateMany({
                            where: { inboundEmailId: email.id },
                            data: { matterId: matter.id },
                        });
                        console.log(`  ✓ [${i + batch.indexOf(email) + 1}/${emails.length}] "${subject.slice(0, 55)}" → MATTER: ${matter.name} (${pct}%)`);
                        linked++;
                    }
                }
            } catch (err) {
                console.error(`  ✗ Error processing email ${email.id}:`, err);
                errors++;
            }
        }));
    }

    console.log(`\n=== Done ===`);
    console.log(`Linked:  ${linked}`);
    console.log(`Skipped: ${skipped} (below confidence threshold)`);
    console.log(`Errors:  ${errors}`);

    await prisma.$disconnect();
}

main().catch(async err => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
});
