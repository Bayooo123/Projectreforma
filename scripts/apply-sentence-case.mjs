#!/usr/bin/env node
/**
 * apply-sentence-case.mjs
 *
 * One-off migration script: normalises text fields in the ASCOLP workspace
 * (or any given workspace) to Sentence Case.
 *
 * Usage:
 *   node scripts/apply-sentence-case.mjs --workspace <id>   [--dry-run]
 *   node scripts/apply-sentence-case.mjs --slug ascolp       [--dry-run]
 *
 * Flags:
 *   --workspace <id>   Target workspace by ID (takes precedence over --slug)
 *   --slug <slug>      Auto-detect workspace by its slug (default: "ascolp")
 *   --dry-run          Preview changes without writing to the database
 *
 * The script processes in batches of 50 and logs a progress table.
 */

import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

// ─── CLI Arg Parsing ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const workspaceIdIdx = args.indexOf('--workspace');
const slugIdx = args.indexOf('--slug');

let workspaceId = workspaceIdIdx !== -1 ? args[workspaceIdIdx + 1] : null;
const slug = slugIdx !== -1 ? args[slugIdx + 1] : 'ascolp';

// ─── Protected Terms (must match src/lib/sentence-case.ts) ────────────────────
const PROTECTED_TERMS = [
    'REFORMA', 'ASCOLP',
    'NDPA', 'FIRS', 'NIPC', 'CAC', 'SEC', 'CBN', 'EFCC', 'NCC', 'NESREA',
    'NAFDAC', 'SON', 'NUPRC', 'NMDPRA', 'FRC', 'TRCN', 'MDCN', 'NMC',
    'NIMC', 'INEC', 'NIC', 'NPC', 'PENCOM', 'NHIA',
    'IGP', 'DIG', 'AIG', 'CP', 'NPDC',
    'CFRN', 'LFN', 'NBA', 'ICAN', 'NIM',
    'OAUTHC', 'OAUTH', 'LUTH',
    'SAN', 'ESQ', 'LLB', 'LLM', 'BL', 'PhD', 'OFR', 'CON', 'OON', 'MFR',
    'V', 'LTD', 'PLC', 'LLC', 'LLP', 'LP', 'INC', 'NGN', 'USD', 'EUR',
    'VAT', 'WHT', 'PAYE',
    'OYES', 'OYSG', 'OYO', 'FCT', 'ABUJA',
    'SC', 'CA', 'FHC', 'CCT', 'NIC',
];
const PROTECTED_MAP = new Map(PROTECTED_TERMS.map(t => [t.toUpperCase(), t]));

function normalizeWord(word) {
    const upper = word.toUpperCase();
    if (PROTECTED_MAP.has(upper)) return PROTECTED_MAP.get(upper);
    return word.toLowerCase();
}

function capitaliseSentence(sentence) {
    if (!sentence) return sentence;
    const words = sentence.split(/\s+/);
    let firstDone = false;
    return words.map(word => {
        if (!word) return word;
        const norm = normalizeWord(word);
        if (!firstDone) {
            firstDone = true;
            return norm.charAt(0).toUpperCase() + norm.slice(1);
        }
        return norm;
    }).join(' ');
}

function toSentenceCase(text) {
    if (!text) return '';
    const sentences = text.split(/(?<=\.)\s+/);
    return sentences.map(s => {
        const trimmed = s.trim();
        if (!trimmed) return trimmed;
        const hasPeriod = trimmed.endsWith('.');
        const core = hasPeriod ? trimmed.slice(0, -1) : trimmed;
        return capitaliseSentence(core) + (hasPeriod ? '.' : '');
    }).join(' ');
}

// ─── Batch Update Helper ───────────────────────────────────────────────────────
let totalChanged = 0;

async function processBatch(model, items, fields, updateFn) {
    for (const item of items) {
        const updates = {};
        let hasChange = false;

        for (const field of fields) {
            const original = item[field];
            if (typeof original === 'string') {
                const normalized = toSentenceCase(original);
                if (normalized !== original) {
                    updates[field] = normalized;
                    hasChange = true;
                    if (isDryRun) {
                        console.log(`  [${model}/${item.id}] ${field}:`);
                        console.log(`    BEFORE: ${original}`);
                        console.log(`    AFTER : ${normalized}`);
                    }
                }
            }
        }

        if (hasChange) {
            totalChanged++;
            if (!isDryRun) {
                await updateFn(item.id, updates);
            }
        }
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log(' REFORMA – Sentence Case Migration Script');
    console.log(`  Mode   : ${isDryRun ? 'DRY RUN (no changes will be written)' : '⚠️  LIVE  (writing to database)'}`);
    console.log('═══════════════════════════════════════════════════════\n');

    // Resolve workspace
    if (!workspaceId) {
        console.log(`Auto-detecting workspace by slug: "${slug}" ...`);
        const ws = await prisma.workspace.findUnique({ where: { slug } });
        if (!ws) {
            console.error(`ERROR: No workspace found with slug "${slug}". Pass --workspace <id> explicitly.`);
            process.exit(1);
        }
        workspaceId = ws.id;
        console.log(`  Found: ${ws.name} (id: ${workspaceId})\n`);
    } else {
        const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
        if (!ws) {
            console.error(`ERROR: No workspace found with id "${workspaceId}".`);
            process.exit(1);
        }
        console.log(`Target workspace: ${ws.name} (id: ${workspaceId})\n`);
    }

    // ── Briefs ─────────────────────────────────────────────────────────────────
    console.log('──────────────────────────────────────────────────────');
    console.log(' Processing: Brief (name, description)');
    const briefs = await prisma.brief.findMany({ where: { workspaceId } });
    console.log(`  Records found: ${briefs.length}`);
    await processBatch('Brief', briefs, ['name', 'description'], async (id, data) => {
        await prisma.brief.update({ where: { id }, data });
    });

    // ── Matters ────────────────────────────────────────────────────────────────
    console.log('\n──────────────────────────────────────────────────────');
    console.log(' Processing: Matter (name, opponentName, opponentCounsel, court, judge)');
    const matters = await prisma.matter.findMany({ where: { workspaceId } });
    console.log(`  Records found: ${matters.length}`);
    await processBatch('Matter', matters, ['name', 'opponentName', 'opponentCounsel', 'court', 'judge'], async (id, data) => {
        await prisma.matter.update({ where: { id }, data });
    });

    // ── Clients ────────────────────────────────────────────────────────────────
    console.log('\n──────────────────────────────────────────────────────');
    console.log(' Processing: Client (name, company)');
    const clients = await prisma.client.findMany({ where: { workspaceId } });
    console.log(`  Records found: ${clients.length}`);
    await processBatch('Client', clients, ['name', 'company'], async (id, data) => {
        await prisma.client.update({ where: { id }, data });
    });

    // ── CalendarEntries ───────────────────────────────────────────────────────
    console.log('\n──────────────────────────────────────────────────────');
    console.log(' Processing: CalendarEntry (proceedings, adjournedFor, title, judge)');
    const calendarEntries = await prisma.calendarEntry.findMany({
        where: { matter: { workspaceId } }
    });
    console.log(`  Records found: ${calendarEntries.length}`);
    await processBatch('CalendarEntry', calendarEntries, ['proceedings', 'adjournedFor', 'title', 'judge'], async (id, data) => {
        await prisma.calendarEntry.update({ where: { id }, data });
    });

    // ── Summary ────────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════');
    if (isDryRun) {
        console.log(` DRY RUN COMPLETE. ${totalChanged} field(s) would be updated.`);
        console.log(' No changes written. Re-run without --dry-run to apply.');
    } else {
        console.log(` MIGRATION COMPLETE. ${totalChanged} field(s) updated.`);
    }
    console.log('═══════════════════════════════════════════════════════\n');
}

main()
    .catch(err => { console.error(err); process.exit(1); })
    .finally(() => prisma.$disconnect());
