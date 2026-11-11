import { prisma } from '@/lib/prisma';

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

/**
 * Pure merge, no AI call — deliberately. CTC/enrolment/search applications
 * and deeds are fill-in-the-blank once the firm's real precedent is in;
 * substituting facts into vetted text is faster and far more reliable than
 * asking an LLM to regenerate legal boilerplate from scratch on every
 * request.
 */
export async function generateStandardDocument(
    workspaceId: string,
    templateIdOrCategory: string,
    facts: Record<string, string>,
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

    const missing = template.variables.filter(v => v.required && !facts[v.name]?.trim()).map(v => v.label);
    if (missing.length > 0) return { missingFields: missing, documentName: template.name };

    const contentNode = template.nodes[0];
    if (!contentNode) return { error: `"${template.name}" has no content configured.` };

    const text = mergeTemplate(contentNode.content, facts);
    return { text, documentName: template.name };
}
