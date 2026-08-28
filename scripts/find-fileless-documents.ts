// Finds Document rows with no real file behind them (blank/whitespace-only
// url) — the state the ingestion/upload code paths now refuse to create
// (see src/lib/services/ingestion.ts, src/app/actions/documents.ts,
// src/app/api/upload/route.ts), but which can still exist from before that
// guard existed. Report-only by default: nothing is deleted unless you pass
// --delete, since the right fix per document might be "re-file the actual
// scanned letter" rather than "remove the record".
//
// Run with: npx tsx scripts/find-fileless-documents.ts [--delete]

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const shouldDelete = process.argv.includes('--delete');

    const documents = await prisma.document.findMany({
        select: {
            id: true, name: true, url: true, uploadedAt: true,
            brief: { select: { id: true, name: true, briefNumber: true } },
        },
        orderBy: { uploadedAt: 'asc' },
    });

    const fileless = documents.filter(d => !d.url?.trim());

    if (fileless.length === 0) {
        console.log('No fileless documents found.');
        return;
    }

    console.log(`Found ${fileless.length} document(s) with no file attached:\n`);
    for (const doc of fileless) {
        const briefRef = doc.brief ? `${doc.brief.name} (${doc.brief.briefNumber ?? doc.brief.id})` : 'no brief';
        console.log(`- "${doc.name}" — ${briefRef} — logged ${doc.uploadedAt.toISOString().slice(0, 10)} — id ${doc.id}`);
    }

    if (!shouldDelete) {
        console.log('\nThis was a report only — nothing was changed. Re-run with --delete to remove these rows, or re-file the actual document under each brief to give it a real file instead.');
        return;
    }

    await prisma.document.deleteMany({ where: { id: { in: fileless.map(d => d.id) } } });
    console.log(`\nDeleted ${fileless.length} fileless document record(s).`);
}

main()
    .catch(err => console.error('Error:', err))
    .finally(() => prisma.$disconnect());
