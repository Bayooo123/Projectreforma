import { prisma } from '@/lib/prisma';

interface MatchResult {
  briefId: string | null;
  matterId: string | null;
  confidence: number;
  reasoning: string;
}

/**
 * Deterministic Content Matcher
 * Links emails to matters based on keyword density and party matching.
 * No AI tokens required.
 */
export async function matchEmailToMatter(
  workspaceId: string,
  subject: string,
  body: string
): Promise<MatchResult> {
  const content = `${subject} ${body}`.toLowerCase();
  
  // 1. Fetch available targets (Matters and Briefs)
  const [matters, briefs] = await Promise.all([
    prisma.matter.findMany({
      where: { workspaceId, deletedAt: null },
      select: { id: true, name: true, clientNameRaw: true, client: { select: { name: true } } }
    }),
    prisma.brief.findMany({
      where: { workspaceId, deletedAt: null },
      select: { id: true, name: true, customTitle: true, client: { select: { name: true } } }
    })
  ]);

  const scores: Array<{ id: string, type: 'MATTER' | 'BRIEF', score: number, reason: string }> = [];

  // 2. Score Matters
  for (const m of matters) {
    let score = 0;
    const reasons: string[] = [];

    // Exact name match (high weight)
    if (m.name && content.includes(m.name.toLowerCase())) {
      score += 0.9;
      reasons.push('Exact matter name match');
    } else {
      // Partial name match (split by " v " or " v. ")
      const parties = m.name.split(/\s+v\.?\s+/i).map(p => p.trim().toLowerCase());
      let partyHits = 0;
      for (const party of parties) {
        if (party.length > 3 && content.includes(party)) {
          score += 0.4;
          partyHits++;
        }
      }
      if (partyHits > 0) reasons.push(`${partyHits} party name(s) matched`);
    }

    // Client name match
    const clientName = m.client?.name || m.clientNameRaw;
    if (clientName && content.includes(clientName.toLowerCase())) {
      score += 0.3;
      reasons.push('Client name match');
    }

    if (score > 0) {
      scores.push({ id: m.id, type: 'MATTER', score: Math.min(score, 1.0), reason: reasons.join(', ') });
    }
  }

  // 3. Score Briefs (similar logic)
  for (const b of briefs) {
    let score = 0;
    const reasons: string[] = [];
    const briefName = b.customTitle || b.name;

    if (content.includes(briefName.toLowerCase())) {
      score += 0.8;
      reasons.push('Brief name match');
    }

    if (b.client?.name && content.includes(b.client.name.toLowerCase())) {
      score += 0.2;
      reasons.push('Client name match');
    }

    if (score > 0) {
      scores.push({ id: b.id, type: 'BRIEF', score: Math.min(score, 1.0), reason: reasons.join(', ') });
    }
  }

  // 4. Find best match
  const best = scores.sort((a, b) => b.score - a.score)[0];

  if (!best || best.score < 0.4) {
    return { briefId: null, matterId: null, confidence: 0, reasoning: 'No significant keyword matches found' };
  }

  return {
    briefId: best.type === 'BRIEF' ? best.id : null,
    matterId: best.type === 'MATTER' ? best.id : null,
    confidence: best.score,
    reasoning: best.reason
  };
}
