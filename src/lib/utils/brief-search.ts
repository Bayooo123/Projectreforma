// The "search briefs by name/number/client" substring match was hand-written
// near-identically in several places (Brief Tracker, the Briefs list, and
// others) — one shared predicate instead of copies that can drift apart.
export interface BriefQueryFields {
    name?: string | null;
    briefNumber?: string | null;
    client?: string | null;
    category?: string | null;
}

export function matchesBriefQuery(fields: BriefQueryFields, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
        (fields.name ?? '').toLowerCase().includes(q) ||
        (fields.briefNumber ?? '').toLowerCase().includes(q) ||
        (fields.client ?? '').toLowerCase().includes(q) ||
        (fields.category ?? '').toLowerCase().includes(q)
    );
}
