// One-off: attach phone numbers to existing users, matched by name.
//
// Run with: npx tsx scripts/set-user-phones.ts
//
// Reads name -> phone pairs from scripts/user-phones.local.json (gitignored,
// not committed — this repo is public, and that file holds real people's
// contact details). Create it locally before running, e.g.:
//   { "Kola Abdulsalam": "2348032483453", "Iniobong Umoh": "2348027739311" }
//
// Safe by construction beyond that: only updates a name when exactly one
// User matches it (case-insensitive substring match on the stored `name`
// field). Zero matches or more than one match are reported and skipped
// rather than guessed at.

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
const DATA_FILE = join(__dirname, 'user-phones.local.json');

async function main() {
    let nameToPhone: Record<string, string>;
    try {
        nameToPhone = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
    } catch {
        console.error(`Could not read ${DATA_FILE} — create it first (see comment at the top of this script for the format).`);
        return;
    }

    for (const [name, phone] of Object.entries(nameToPhone)) {
        const matches = await prisma.user.findMany({
            where: { name: { contains: name, mode: 'insensitive' } },
            select: { id: true, name: true, email: true, phone: true },
        });

        if (matches.length === 0) {
            console.log(`SKIP  "${name}" — no user found matching this name.`);
            continue;
        }
        if (matches.length > 1) {
            console.log(`SKIP  "${name}" — ${matches.length} users matched, ambiguous:`);
            matches.forEach(m => console.log(`        ${m.id}  ${m.name}  ${m.email}  (current phone: ${m.phone ?? 'none'})`));
            continue;
        }

        const user = matches[0];
        await prisma.user.update({ where: { id: user.id }, data: { phone } });
        console.log(`OK    ${user.name} (${user.email}) — phone set to ${phone}${user.phone ? ` (was ${user.phone})` : ''}`);
    }
}

main()
    .catch(err => console.error('Error:', err))
    .finally(() => prisma.$disconnect());
