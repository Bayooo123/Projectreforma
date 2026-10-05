// Hashes workspace revenuePin / litigationPin values that were stored as
// plaintext before setRevenuePin and updateWorkspaceSettings started hashing
// them. checkWorkspacePin upgrades a plaintext PIN on the next correct entry,
// but until then the raw PIN sits in the database — this closes that window
// for every workspace at once. (Old SHA-256 hashes can't be converted without
// the PIN itself; those upgrade to bcrypt on next use.) Report-only by
// default; pass --apply to write.
//
// Run with: npx tsx scripts/hash-plaintext-pins.ts [--apply]

import { PrismaClient } from '@prisma/client';
import { hashPin, isBcryptHash } from '../src/lib/workspace-pins';

const prisma = new PrismaClient();
const FIELDS = ['revenuePin', 'litigationPin'] as const;

async function main() {
    const apply = process.argv.includes('--apply');

    const workspaces = await prisma.workspace.findMany({
        where: { OR: FIELDS.map(f => ({ [f]: { not: null } })) },
        select: { id: true, name: true, revenuePin: true, litigationPin: true },
    });

    let pending = 0;
    for (const ws of workspaces) {
        const data: Partial<Record<(typeof FIELDS)[number], string>> = {};
        for (const field of FIELDS) {
            const value = ws[field];
            if (value && !isBcryptHash(value) && !/^[0-9a-f]{64}$/.test(value)) data[field] = await hashPin(value);
        }
        const fields = Object.keys(data);
        if (fields.length === 0) continue;

        pending++;
        console.log(`- ${ws.name} (${ws.id}): plaintext ${fields.join(', ')}`);
        if (apply) await prisma.workspace.update({ where: { id: ws.id }, data });
    }

    if (pending === 0) console.log('No plaintext PINs found.');
    else if (!apply) console.log(`\n${pending} workspace(s) affected. Report only — re-run with --apply to hash them.`);
    else console.log(`\nHashed PINs for ${pending} workspace(s).`);
}

main()
    .catch(e => { console.error(e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
