// What a filing bundle needs to be complete, by purpose. Only 'fresh_matter'
// is populated — the required-document list for a responsive filing (a
// defence, a reply) depends on what was served and is genuinely harder to
// pin down from a fixed list, so it's deliberately not scoped yet rather
// than guessed at.
export type FilingPurpose = 'fresh_matter';

export interface FilingComponentDef {
    key: string;
    label: string;
    // Case-SENSITIVE, matched against the ALL-CAPS heading form a document
    // uses for its own title — not matched loosely against lower-cased
    // text. This matters: a Writ of Summons's own boilerplate names what
    // should accompany it ("The Claimant's Statement of Claim, List of
    // Witnesses... are filed with this Writ") in ordinary title case, which
    // a loose match would misread as that document actually being present.
    // The real section headings in ASCOLP's filings are in full caps
    // ("STATEMENT OF CLAIM", "LIST OF DOCUMENTS TO BE RELIED ON...") —
    // confirmed directly against sample filings, not assumed — so matching
    // on the caps form distinguishes "this document is here" from "this
    // document is merely mentioned."
    markers: string[];
}

export const FILING_COMPONENTS: FilingComponentDef[] = [
    { key: 'writ_of_summons', label: 'Writ of Summons', markers: ['WRIT OF SUMMONS'] },
    { key: 'statement_of_claim', label: 'Statement of Claim', markers: ['STATEMENT OF CLAIM'] },
    { key: 'list_of_witnesses', label: 'List of Witnesses', markers: ['LIST OF WITNESSES'] },
    {
        key: 'written_statement_on_oath',
        // Inferred from naming convention, not confirmed against a sample —
        // none of the filings reviewed so far included one (it was in fact
        // the missing component in the first bundle checked). Revisit this
        // marker once a real example is seen.
        label: 'Written Statement(s) on Oath of Witnesses',
        markers: ['WRITTEN STATEMENT ON OATH', 'WRITTEN STATEMENTS ON OATH'],
    },
    {
        key: 'list_of_documents',
        label: 'List of Documents to be Relied On',
        markers: ['LIST OF DOCUMENTS'],
    },
];

// Required components per purpose. For fresh_matter this is taken directly
// from the Writ of Summons's own boilerplate: "The Claimant's Statement of
// Claim, List of Witnesses, Written Statements on Oath of Witnesses and
// copies of the documents to be relied on are filed with this Writ." —
// i.e. the court filing itself states what must accompany it.
export const FILING_CHECKLISTS: Record<FilingPurpose, string[]> = {
    fresh_matter: [
        'writ_of_summons',
        'statement_of_claim',
        'list_of_witnesses',
        'written_statement_on_oath',
        'list_of_documents',
    ],
};

export interface CompletenessResult {
    purpose: FilingPurpose;
    present: { key: string; label: string }[];
    missing: { key: string; label: string }[];
}

/**
 * Checks a bundle's combined OCR text against the required components for
 * a purpose. Operates on whatever text is available — documents that
 * failed OCR simply can't contribute a match, which surfaces as a false
 * "missing" the lawyer can judge directly against what they uploaded,
 * rather than a silent skip.
 */
export function evaluateCompleteness(purpose: FilingPurpose, documentTexts: string[]): CompletenessResult {
    const combined = documentTexts.join('\n');
    const required = FILING_CHECKLISTS[purpose].map(key => FILING_COMPONENTS.find(c => c.key === key)!);

    const present: CompletenessResult['present'] = [];
    const missing: CompletenessResult['missing'] = [];

    for (const component of required) {
        const found = component.markers.some(marker => combined.includes(marker));
        (found ? present : missing).push({ key: component.key, label: component.label });
    }

    return { purpose, present, missing };
}
