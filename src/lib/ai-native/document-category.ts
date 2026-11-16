// Keyword match onto the real DraftingTemplate.category slugs
// (src/lib/drafting/standard-documents.ts) — deterministic, no AI call
// needed for a fixed set of six document types. Order matters: more
// specific keywords (e.g. "sublease") must be checked before the
// substrings they contain ("lease").
const CATEGORY_KEYWORDS: [string, string][] = [
    ['ctc_application', 'ctc'],
    ['enrolment_of_order', 'enrolment'],
    ['enrolment_of_order', 'enrollment'],
    ['search_application', 'search'],
    ['deed_of_sublease', 'sublease'],
    ['deed_of_lease', 'lease'],
    ['tenancy_agreement', 'tenancy'],
];

export function guessDocumentCategory(text: string): string | null {
    const lower = text.toLowerCase();
    for (const [category, keyword] of CATEGORY_KEYWORDS) {
        if (lower.includes(keyword)) return category;
    }
    return null;
}
