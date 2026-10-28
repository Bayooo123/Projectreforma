import { NextRequest, NextResponse } from 'next/server';
import { requireOjogbonUser } from '@/lib/ojogbon/server';

/**
 * Paper search for Ojogbon, backed by OpenAlex (free, open scholarly index).
 * Kept behind one endpoint so another provider (e.g. Consensus' API) can be
 * slotted in later without touching the studio.
 */

type OpenAlexWork = {
    id: string;
    doi?: string | null;
    display_name?: string;
    publication_year?: number;
    cited_by_count?: number;
    authorships?: { author?: { display_name?: string } }[];
    primary_location?: { landing_page_url?: string | null; source?: { display_name?: string } | null } | null;
    abstract_inverted_index?: Record<string, number[]> | null;
};

function abstractFrom(index?: Record<string, number[]> | null): string {
    if (!index) return '';
    const words: string[] = [];
    for (const [word, positions] of Object.entries(index)) for (const p of positions) words[p] = word;
    return words.filter(Boolean).join(' ').slice(0, 1500);
}

function authorsFrom(w: OpenAlexWork): string {
    const names = (w.authorships ?? []).map(a => a.author?.display_name).filter(Boolean) as string[];
    if (!names.length) return '';
    return names.length > 2 ? `${names[0]} et al.` : names.join(' & ');
}

export async function POST(req: NextRequest) {
    const who = await requireOjogbonUser();
    if (who instanceof NextResponse) return who;

    const { query } = (await req.json().catch(() => ({}))) as { query?: unknown };
    const q = typeof query === 'string' ? query.trim().slice(0, 300) : '';
    if (!q) return NextResponse.json({ papers: [] });

    const doi = q.match(/10\.\d{4,9}\/\S+/)?.[0];
    const fields = 'id,doi,display_name,publication_year,cited_by_count,authorships,primary_location,abstract_inverted_index';
    const url = doi
        ? `https://api.openalex.org/works?filter=doi:${encodeURIComponent(doi)}&select=${fields}`
        : `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=8&select=${fields}`;

    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Ojogbon (reforma.ng; mailto:hello@reforma.ng)' },
            next: { revalidate: 3600 },
        });
        if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
        const data = (await res.json()) as { results?: OpenAlexWork[] };
        const papers = (data.results ?? [])
            .filter(w => w.display_name)
            .map(w => ({
                title: w.display_name as string,
                url: w.doi || w.primary_location?.landing_page_url || w.id,
                authors: authorsFrom(w),
                year: w.publication_year ? String(w.publication_year) : '',
                journal: w.primary_location?.source?.display_name ?? '',
                cites: w.cited_by_count ? `${w.cited_by_count} citations` : '',
                abstract: abstractFrom(w.abstract_inverted_index),
            }));
        return NextResponse.json({ papers });
    } catch (error) {
        console.error('[ojogbon/search] failed', (error as Error).message);
        return NextResponse.json({ code: 'unavailable', error: 'Paper search is unavailable right now.' }, { status: 502 });
    }
}
