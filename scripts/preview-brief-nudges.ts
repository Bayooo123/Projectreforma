// Dry run: for every active brief, shows exactly the WhatsApp message the
// nightly Brief Manager scan would send RIGHT NOW, without sending it, and
// without writing anything to the database — no insight is saved/updated, no
// WhatsApp message goes out, no nudge gets logged (so running this has zero
// effect on the daily-cap count or the routine 7-day check-in timer).
//
// Reuses the actual production logic (generateBriefManagerInsight,
// isActionable, isRoutineCheckinDue, buildNudgeMessage from
// src/lib/agents/brief-manager/scan.ts) rather than reimplementing it, so
// this preview can't drift from what the real scan does.
//
// Needs the same .env as the main app (DATABASE_URL, ANTHROPIC_API_KEY, and
// whatever else src/lib/config.ts requires) since it's importing real
// application code, not a standalone script.
//
// Cost note: this calls generateBriefManagerInsight — a real Claude Sonnet
// call — for every active brief, the same as the nightly scan does. Running
// this against a firm with many active briefs is not free.
//
// Run with: npx tsx scripts/preview-brief-nudges.ts

import { prisma } from '../src/lib/prisma';
import {
    generateBriefManagerInsight,
    isActionable,
    isRoutineCheckinDue,
    daysSinceLastNudge,
    buildNudgeMessage,
} from '../src/lib/agents/brief-manager/scan';

async function main() {
    const briefs = await prisma.brief.findMany({
        where: { status: 'active', deletedAt: null },
        select: { id: true, name: true, briefNumber: true, lawyerId: true, lawyerInChargeId: true, workspace: { select: { name: true } } },
        orderBy: { name: 'asc' },
    });

    console.log(`Checking ${briefs.length} active brief(s)...\n`);

    let wouldSend = 0, skipped = 0, failed = 0;

    for (const brief of briefs) {
        const label = `${brief.name} (${brief.briefNumber}) — ${brief.workspace.name}`;

        const generated = await generateBriefManagerInsight(brief.id);
        if (!generated.success) {
            console.log(`— ${label}\n  SKIPPED: ${generated.reason}\n`);
            failed++;
            continue;
        }

        const { data, lastSignalAt } = generated.insight;
        const daysSinceLastActivity = Math.floor((Date.now() - lastSignalAt.getTime()) / 86_400_000);
        const actionable = isActionable(data, daysSinceLastActivity);
        const daysSinceNudge = await daysSinceLastNudge(brief.id);
        const routineDue = !actionable && isRoutineCheckinDue(daysSinceNudge);

        if (!actionable && !routineDue) {
            console.log(`— ${label}\n  No message would be sent — nothing actionable, and the routine check-in isn't due yet (last nudged ${daysSinceNudge ?? 'never'} day(s) ago).\n`);
            skipped++;
            continue;
        }

        const responsibleId = brief.lawyerInChargeId ?? brief.lawyerId;
        const responsible = await prisma.user.findUnique({ where: { id: responsibleId }, select: { name: true, phone: true } });
        const message = buildNudgeMessage(brief, data, lastSignalAt, daysSinceLastActivity, routineDue);
        const urgent = data.timeBoundDeadline?.status === 'overdue';
        const reason = routineDue ? 'routine 7-day check-in' : 'actionable condition';

        console.log(`— ${label}`);
        console.log(`  To: ${responsible?.name ?? 'Unknown'}${responsible?.phone ? '' : ' — NO PHONE ON FILE, this would not actually go out'}`);
        console.log(`  Reason: ${reason}${urgent ? ' (URGENT — bypasses quiet hours/daily cap)' : ''}`);
        console.log('  Message:');
        console.log('  ' + message.split('\n').join('\n  '));
        console.log('');
        wouldSend++;
    }

    console.log(`\nSummary: ${wouldSend} message(s) would be sent, ${skipped} brief(s) have nothing due, ${failed} could not be evaluated.`);
}

main()
    .catch(err => console.error('Error:', err))
    .finally(() => prisma.$disconnect());
