import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Optimized Backfill: Email Content Matching ---');

  // 1. Fetch unlinked emails
  const unlinkedEmails = await prisma.inboundEmail.findMany({
    where: {
      matterId: null,
      workspaceId: { not: null }
    }
  });

  console.log(`Found ${unlinkedEmails.length} unlinked emails.`);

  // 2. Cache workspace data to avoid N+1 queries
  const workspaces = [...new Set(unlinkedEmails.map(e => e.workspaceId))];
  const workspaceData: Record<string, { matters: any[], briefs: any[] }> = {};

  for (const wid of workspaces) {
    if (!wid) continue;
    const [matters, briefs] = await Promise.all([
      prisma.matter.findMany({
        where: { workspaceId: wid, deletedAt: null },
        select: { id: true, name: true, clientNameRaw: true, client: { select: { name: true } } }
      }),
      prisma.brief.findMany({
        where: { workspaceId: wid, deletedAt: null },
        select: { id: true, name: true, customTitle: true, client: { select: { name: true } } }
      })
    ]);
    workspaceData[wid] = { matters, briefs };
  }

  let matchedCount = 0;

  for (const email of unlinkedEmails) {
    if (!email.workspaceId) continue;
    const data = workspaceData[email.workspaceId];
    if (!data) continue;

    const content = `${email.subject} ${email.body || ''}`.toLowerCase();
    let bestMatch: { id: string, type: 'MATTER' | 'BRIEF', score: number, reason: string } | null = null;

    // Fast Scoring Logic (In-Memory)
    for (const m of data.matters) {
      let score = 0;
      if (m.name && content.includes(m.name.toLowerCase())) score += 0.9;
      else {
        const parties = m.name.split(/\s+v\.?\s+/i).map(p => p.trim().toLowerCase());
        for (const party of parties) { if (party.length > 3 && content.includes(party)) score += 0.4; }
      }
      if (m.client?.name && content.includes(m.client.name.toLowerCase())) score += 0.3;

      if (score > (bestMatch?.score || 0)) {
        bestMatch = { id: m.id, type: 'MATTER', score, reason: 'Matched content' };
      }
    }

    if (bestMatch && bestMatch.score > 0.45) {
      console.log(`[MATCH] "${email.subject}" -> ${bestMatch.id} (${Math.round(bestMatch.score * 100)}%)`);
      await prisma.inboundEmail.update({
        where: { id: email.id },
        data: { matterId: bestMatch.type === 'MATTER' ? bestMatch.id : null }
      });
      matchedCount++;
    }
  }

  console.log('--- Backfill Complete ---');
  console.log(`Total Matched: ${matchedCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
