import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';
import { completeJSON } from '@/lib/agents/ai-client';
import { DraftingService } from './drafting-service';

export interface StandardDocVariable {
    name: string;
    label: string;
    required: boolean;
}

export interface StandardDocTypeDef {
    category: string;
    name: string;
    description: string;
    variables: StandardDocVariable[];
}

// The firm's first WhatsApp-draftable standard documents — reuses the
// DraftingTemplate/DraftingVariable/DraftingNode schema that already
// existed (designed, never wired up) rather than inventing a parallel
// registry. Content starts unpublished (a placeholder) until the firm
// supplies its own precedent for each: these are real instruments clients
// and courts see, so they're drafted from ASCOLP's actual house style and
// Lagos-specific requirements, never invented from general training
// knowledge.
export const STANDARD_DOCUMENT_TYPES: StandardDocTypeDef[] = [
    {
        category: 'ctc_application',
        name: 'Application for Certified True Copy (CTC)',
        description: 'Application to the court registry for a certified true copy of a judgment, ruling, or other court process.',
        variables: [
            { name: 'court', label: 'Court', required: true },
            { name: 'suit_number', label: 'Suit number', required: true },
            { name: 'case_title', label: 'Case title (e.g. "A v B")', required: true },
            { name: 'document_requested', label: 'Document requested (e.g. "Judgment delivered 12 March 2026")', required: true },
            { name: 'applicant_name', label: 'Applicant name', required: true },
            { name: 'applicant_capacity', label: 'Applicant capacity (e.g. "Counsel for the Claimant")', required: true },
        ],
    },
    {
        category: 'enrolment_of_order',
        name: 'Application for Enrolment of Order',
        description: 'Application to enrol a court order or judgment.',
        variables: [
            { name: 'court', label: 'Court', required: true },
            { name: 'suit_number', label: 'Suit number', required: true },
            { name: 'case_title', label: 'Case title', required: true },
            { name: 'order_description', label: 'Order to be enrolled (what it is, date made)', required: true },
            { name: 'applicant_name', label: 'Applicant name', required: true },
            { name: 'applicant_capacity', label: 'Applicant capacity', required: true },
        ],
    },
    {
        category: 'search_application',
        name: 'Application for Search',
        description: 'Application to search and inspect the court file/processes of a matter.',
        variables: [
            { name: 'court', label: 'Court', required: true },
            { name: 'suit_number', label: 'Suit number', required: true },
            { name: 'case_title', label: 'Case title', required: true },
            { name: 'applicant_name', label: 'Applicant name', required: true },
            { name: 'applicant_capacity', label: 'Applicant capacity', required: true },
            { name: 'purpose', label: 'Purpose of search', required: false },
        ],
    },
    {
        category: 'deed_of_lease',
        name: 'Deed of Lease',
        description: 'Deed granting a lease over a property.',
        variables: [
            { name: 'lessor_name', label: 'Lessor name', required: true },
            { name: 'lessor_address', label: 'Lessor address', required: false },
            { name: 'lessee_name', label: 'Lessee name', required: true },
            { name: 'lessee_address', label: 'Lessee address', required: false },
            { name: 'property_description', label: 'Property description', required: true },
            { name: 'lease_term', label: 'Lease term (e.g. "3 years")', required: true },
            { name: 'commencement_date', label: 'Commencement date', required: true },
            { name: 'rent_amount', label: 'Rent amount', required: true },
            { name: 'rent_review_terms', label: 'Rent review terms', required: false },
        ],
    },
    {
        category: 'deed_of_sublease',
        name: 'Deed of Sublease',
        description: 'Deed granting a sublease derived from an existing head lease.',
        variables: [
            { name: 'sublessor_name', label: 'Sublessor name', required: true },
            { name: 'sublessee_name', label: 'Sublessee name', required: true },
            { name: 'head_lease_reference', label: 'Head lease reference', required: true },
            { name: 'property_description', label: 'Property description', required: true },
            { name: 'sublease_term', label: 'Sublease term', required: true },
            { name: 'commencement_date', label: 'Commencement date', required: true },
            { name: 'rent_amount', label: 'Rent amount', required: true },
        ],
    },
    {
        category: 'tenancy_agreement',
        name: 'Tenancy Agreement',
        description: 'Agreement for a tenancy over a property.',
        variables: [
            { name: 'landlord_name', label: 'Landlord name', required: true },
            { name: 'tenant_name', label: 'Tenant name', required: true },
            { name: 'property_description', label: 'Property description', required: true },
            { name: 'tenancy_term', label: 'Tenancy term (e.g. "1 year")', required: true },
            { name: 'commencement_date', label: 'Commencement date', required: true },
            { name: 'rent_amount', label: 'Rent amount', required: true },
            { name: 'rent_payment_terms', label: 'Rent payment terms', required: false },
        ],
    },
];

const PENDING_CONTENT = '[TEMPLATE PENDING — the firm has not yet supplied its precedent for this document. Do not use.]';

/**
 * Ensures this workspace has a DraftingTemplate row (+ variables, + one
 * content node) for each of STANDARD_DOCUMENT_TYPES. Created unpublished
 * so generateStandardDocument refuses to draft from them until a real
 * precedent replaces the placeholder content — called lazily on every
 * tool invocation; cheap after the first run (a handful of findFirst
 * checks against the indexed workspaceId).
 */
export async function ensureStandardDocumentTemplates(workspaceId: string, authorId: string): Promise<void> {
    for (const def of STANDARD_DOCUMENT_TYPES) {
        const existing = await prisma.draftingTemplate.findFirst({ where: { workspaceId, category: def.category } });
        if (existing) continue;

        await prisma.draftingTemplate.create({
            data: {
                name: def.name,
                description: def.description,
                category: def.category,
                workspaceId,
                authorId,
                isPublished: false,
                variables: { create: def.variables.map(v => ({ name: v.name, label: v.label, type: 'string', required: v.required })) },
                nodes: { create: [{ type: 'content', content: PENDING_CONTENT, order: 0 }] },
            },
        });
    }
}

export async function listStandardDocumentTypes(workspaceId: string, authorId: string) {
    await ensureStandardDocumentTemplates(workspaceId, authorId);

    const templates = await prisma.draftingTemplate.findMany({
        where: { workspaceId },
        select: {
            id: true, name: true, category: true, description: true, isPublished: true,
            variables: { select: { name: true, label: true, required: true } },
        },
        orderBy: { name: 'asc' },
    });

    return templates.map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        description: t.description,
        ready: t.isPublished,
        fields: t.variables,
    }));
}

function mergeTemplate(content: string, facts: Record<string, string>): string {
    return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => facts[key] ?? `[Missing: ${key}]`);
}

interface GenerateResult {
    text?: string;
    missingFields?: string[];
    error?: string;
    documentName?: string;
}

interface BriefRecordContext {
    briefName: string;
    matter: { court: string | null; judge: string | null; caseNumber: string | null; name: string } | null;
}

// Facts that already live on the Matter record (or are just the brief's own
// name) — free, instant, no AI call. A lawyer should never be asked to
// retype a suit number that's already in the system.
const RECORD_FIELD_MAP: Record<string, (ctx: BriefRecordContext) => string | null | undefined> = {
    court: ctx => ctx.matter?.court,
    judge: ctx => ctx.matter?.judge,
    suit_number: ctx => ctx.matter?.caseNumber,
    case_title: ctx => ctx.matter?.name ?? ctx.briefName,
};

async function fillFromBriefRecord(
    briefId: string,
    missing: StandardDocVariable[],
    facts: Record<string, string>,
): Promise<Record<string, string>> {
    const applicable = missing.filter(v => v.name in RECORD_FIELD_MAP);
    if (applicable.length === 0) return facts;

    const brief = await prisma.brief.findUnique({
        where: { id: briefId },
        select: { name: true, matter: { select: { court: true, judge: true, caseNumber: true, name: true } } },
    });
    if (!brief) return facts;

    const ctx: BriefRecordContext = { briefName: brief.name, matter: brief.matter };
    const filled = { ...facts };
    for (const v of applicable) {
        const value = RECORD_FIELD_MAP[v.name](ctx);
        if (value) filled[v.name] = value;
    }
    return filled;
}

// Whatever's still missing after the record check has to come from inside
// the brief's actual filed documents (a suit number only visible on a
// scanned process, for instance) — one semantic search plus one extraction
// call, never one call per field. Anything the model can't clearly find
// stays missing rather than being guessed.
async function fillFromFiledDocuments(
    briefId: string,
    missing: StandardDocVariable[],
    facts: Record<string, string>,
): Promise<Record<string, string>> {
    if (!config.VOYAGE_API_KEY || missing.length === 0) return facts;

    const query = missing.map(v => v.label).join('; ');
    let context: string;
    try {
        context = await DraftingService.retrieveContext(briefId, query, 8);
    } catch (err) {
        console.error('[standard-documents] retrieveContext failed:', err);
        return facts;
    }
    if (!context.trim()) return facts;

    const keys = missing.map(v => v.name);
    const prompt = `From the passages below (taken from documents filed on this matter), extract these facts if they are clearly present: ${missing.map(v => `${v.name} (${v.label})`).join('; ')}.\n\nPassages:\n${context}\n\nReturn ONLY a JSON object with exactly these keys: ${JSON.stringify(keys)}. Use null for any fact not clearly present — never guess or invent a value.`;

    try {
        const raw = await completeJSON({
            system: 'You extract facts verbatim from legal documents. Never invent or guess a value you cannot find — use null.',
            prompt,
            tier: 'quick',
            maxTokens: 512,
        });
        const extracted = JSON.parse(raw) as Record<string, unknown>;
        const filled = { ...facts };
        for (const key of keys) {
            const value = extracted[key];
            if (typeof value === 'string' && value.trim()) filled[key] = value.trim();
        }
        return filled;
    } catch (err) {
        console.error('[standard-documents] fact extraction failed:', err);
        return facts;
    }
}

/**
 * Pure merge, no AI call for the document itself — deliberately. CTC/
 * enrolment/search applications and deeds are fill-in-the-blank once the
 * firm's real precedent is in; substituting facts into vetted text is
 * faster and far more reliable than asking an LLM to regenerate legal
 * boilerplate from scratch on every request.
 *
 * Facts are filled in this order before anything is reported missing:
 * 1. Whatever the caller already supplied.
 * 2. The Matter record (court, judge, suit number, case title) — free.
 * 3. The brief's filed documents, via semantic search + one extraction
 *    call — only tried for whatever's still missing after step 2.
 * Only what's left after all three is ever reported back as missing.
 */
export async function generateStandardDocument(
    workspaceId: string,
    templateIdOrCategory: string,
    facts: Record<string, string>,
    briefId?: string,
): Promise<GenerateResult> {
    const template = await prisma.draftingTemplate.findFirst({
        where: { workspaceId, OR: [{ id: templateIdOrCategory }, { category: templateIdOrCategory }] },
        include: { variables: true, nodes: { orderBy: { order: 'asc' }, take: 1 } },
    });
    if (!template) {
        return { error: `No document type matching "${templateIdOrCategory}". Use list_standard_document_types to see what's available.` };
    }
    if (!template.isPublished) {
        return { error: `"${template.name}" is not finalized yet — the firm hasn't supplied its precedent for this document. Ask them to add it before it can be drafted.` };
    }

    let filled = facts;
    if (briefId) {
        const missingBeforeFill = template.variables.filter(v => v.required && !filled[v.name]?.trim());
        if (missingBeforeFill.length > 0) {
            filled = await fillFromBriefRecord(briefId, missingBeforeFill, filled);
            const stillMissing = template.variables.filter(v => v.required && !filled[v.name]?.trim());
            if (stillMissing.length > 0) {
                filled = await fillFromFiledDocuments(briefId, stillMissing, filled);
            }
        }
    }

    const missing = template.variables.filter(v => v.required && !filled[v.name]?.trim()).map(v => v.label);
    if (missing.length > 0) return { missingFields: missing, documentName: template.name };

    const contentNode = template.nodes[0];
    if (!contentNode) return { error: `"${template.name}" has no content configured.` };

    const text = mergeTemplate(contentNode.content, filled);
    return { text, documentName: template.name };
}
