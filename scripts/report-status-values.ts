// Read-only. Lists every distinct value (with row counts) currently stored in
// the free-text status/type columns the As-Is report flagged for conversion to
// database enums. A Postgres enum migration fails outright if any existing
// row holds a value outside the enum, so the enum definitions have to be
// written from this output, not from the code comments.
//
// Run with: npx tsx scripts/report-status-values.ts

import { prisma } from '../src/lib/prisma';

const COLUMNS: Array<[table: string, column: string]> = [
    ['Brief', 'status'],
    ['Matter', 'status'],
    ['Invoice', 'status'],
    ['Task', 'status'],
    ['ComplianceTask', 'status'],
    ['PulseEvent', 'intent'],
    ['PulseEvent', 'urgency'],
    ['PulseEvent', 'status'],
    ['PulseEvent', 'senderType'],
    ['AgentInsight', 'status'],
    ['AgentInsight', 'agentType'],
    ['WorkspaceAnomaly', 'type'],
    ['WorkspaceAnomaly', 'severity'],
    ['WorkspaceAnomaly', 'status'],
    ['Notification', 'type'],
    ['Notification', 'priority'],
    ['Notification', 'status'],
];

async function main() {
    for (const [table, column] of COLUMNS) {
        const rows = await prisma.$queryRawUnsafe<Array<{ value: string | null; count: bigint }>>(
            `SELECT "${column}" AS value, COUNT(*) AS count FROM "${table}" GROUP BY "${column}" ORDER BY COUNT(*) DESC`
        );
        console.log(`\n${table}.${column}`);
        for (const r of rows) console.log(`  ${JSON.stringify(r.value).padEnd(32)} ${r.count}`);
    }
}

main()
    .catch(e => { console.error(e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
