// Runs the ingestion pipeline (OCR/text extraction, classification, version
// detection, timeline extraction, embeddings) over documents that never got
// it — every file uploaded through the brief upload UI before createDocument
// started calling DocumentIngestionService.processFromUrl. Those rows have
// ocrText = null and are invisible to search and to every AI surface.
// Email-attachment documents that were never filed at all are a separate gap:
// see scripts/sync-email-documents.ts.
//
// Report-only by default. Processing calls paid APIs (OCR fallback, timeline
// LLM, Voyage embeddings), so --apply takes an optional --limit=N.
//
// Run with: npx tsx scripts/backfill-document-processing.ts [--apply] [--limit=50]

import { prisma } from '../src/lib/prisma';
import { DocumentIngestionService } from '../src/lib/services/ingestion';

async function main() {
    const apply = process.argv.includes('--apply');
    const limitArg = process.argv.find(a => a.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

    const docs = await prisma.document.findMany({
        where: { ocrText: null, ocrStatus: { not: 'failed' }, url: { not: '' } },
        select: { id: true, name: true, uploadedAt: true },
        orderBy: { uploadedAt: 'desc' },
        take: limit,
    });

    console.log(`${docs.length} document(s) have never been processed.`);
    if (!apply) {
        console.log('Report only — re-run with --apply (and optionally --limit=N) to process them.');
        return;
    }

    let done = 0;
    for (const doc of docs) {
        process.stdout.write(`[${++done}/${docs.length}] ${doc.name} … `);
        const result = await DocumentIngestionService.processFromUrl(doc.id);
        console.log(result && !('error' in result && result.error) ? 'ok' : 'failed');
    }
}

main()
    .catch(e => { console.error(e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
