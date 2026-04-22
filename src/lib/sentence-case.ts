/**
 * Sentence Case Utility — REFORMA Platform
 *
 * Rules:
 *  • First letter of each sentence is capitalised; all other words are lowercased.
 *  • Words that appear in PROTECTED_TERMS are always kept in their canonical form
 *    regardless of their position in the sentence.
 *  • Multi-sentence strings (split by ". ") are processed sentence-by-sentence.
 *  • null / undefined / empty strings are returned as "".
 *
 * To add a new protected term (e.g. a new regulator), append it to PROTECTED_TERMS.
 */

// ─── Protected Terms Dictionary ───────────────────────────────────────────────
// Entries are matched case-insensitively and restored to the exact casing shown here.
export const PROTECTED_TERMS: string[] = [
    // Platform / brand
    'REFORMA', 'ASCOLP',
    // Regulators & government bodies (Nigeria)
    'NDPA', 'FIRS', 'NIPC', 'CAC', 'SEC', 'CBN', 'EFCC', 'NCC', 'NESREA',
    'NAFDAC', 'SON', 'NUPRC', 'NMDPRA', 'FRC', 'TRCN', 'MDCN', 'NMC',
    'NIMC', 'INEC', 'NIC', 'NPC', 'PENCOM', 'NHIA',
    // Police / security
    'IGP', 'DIG', 'AIG', 'CP', 'NPDC',
    // Law / legal standards
    'CFRN', 'LFN', 'NBA', 'ICAN', 'NIM',
    // Hospitals / institutions (appears in ASCOLP data)
    'OAUTHC', 'OAUTH', 'LUTH',
    // Legal titles / qualifications
    'SAN', 'ESQ', 'LLB', 'LLM', 'BL', 'PhD', 'OFR', 'CON', 'OON', 'MFR',
    // Legal / court abbreviations
    'V', 'LTD', 'PLC', 'LLC', 'LLP', 'LP', 'INC', 'NGN', 'USD', 'EUR',
    'VAT', 'WHT', 'PAYE',
    // Common Nigerian state / institution acronyms
    'OYES', 'OYSG', 'OYO', 'FCT', 'ABUJA',
    // Courts
    'SC', 'CA', 'FHC', 'CCT', 'NIC',
];

// Build a fast lookup set (uppercase keys → canonical form)
const _PROTECTED_MAP = new Map<string, string>(
    PROTECTED_TERMS.map(term => [term.toUpperCase(), term])
);

// ─── Core transform ───────────────────────────────────────────────────────────

/**
 * Converts a single token (word) to its correct form:
 *  • If it's a protected term, return the canonical casing.
 *  • Otherwise return the word fully lowercased.
 */
function normalizeWord(word: string): string {
    const upper = word.toUpperCase();
    if (_PROTECTED_MAP.has(upper)) {
        return _PROTECTED_MAP.get(upper)!;
    }
    return word.toLowerCase();
}

/**
 * Applies sentence case to a single sentence string (no full-stop splitting).
 * The first alphabetic character of the sentence is capitalised.
 */
function _capitaliseSentence(sentence: string): string {
    if (!sentence) return sentence;

    const words = sentence.split(/\s+/);
    let firstWordCapitalised = false;

    return words
        .map(word => {
            if (!word) return word;
            const normalized = normalizeWord(word);

            // Capitalise the first meaningful word of the sentence
            if (!firstWordCapitalised) {
                firstWordCapitalised = true;
                return normalized.charAt(0).toUpperCase() + normalized.slice(1);
            }
            return normalized;
        })
        .join(' ');
}

/**
 * Converts an arbitrary text string to sentence case.
 *
 * • Handles multi-sentence text (splits on ". ").
 * • Preserves protected/acronym terms.
 * • Returns "" for null/undefined/empty input.
 *
 * @example
 * toSentenceCase("HOTELLIERS V. AG OF OYO AND FIRS")
 * // → "Hotelliers v. Ag of Oyo and FIRS"
 *
 * toSentenceCase("ELBETHEL V SHOKOYA")
 * // → "Elbethel v shokoya"
 */
export function toSentenceCase(text: string | null | undefined): string {
    if (!text) return '';

    // Split on sentence boundaries (". " or ".\n") while keeping the period.
    // We use a lookahead so the delimiter stays attached to the preceding sentence.
    const sentences = text.split(/(?<=\.)\s+/);

    return sentences
        .map(sentence => {
            // Strip leading/trailing whitespace within each fragment
            const trimmed = sentence.trim();
            if (!trimmed) return trimmed;

            // Check if the sentence ends with a period — preserve it
            const hasPeriod = trimmed.endsWith('.');
            const withoutPeriod = hasPeriod ? trimmed.slice(0, -1) : trimmed;

            return _capitaliseSentence(withoutPeriod) + (hasPeriod ? '.' : '');
        })
        .join(' ');
}

// ─── Title Case ───────────────────────────────────────────────────────────────

// Short words that stay lowercase unless they open the string.
// Legal "v" / "v." are protected terms and are handled by the map above.
const _LOWER_WORDS = new Set([
    'a', 'an', 'the',
    'and', 'but', 'or', 'nor', 'so', 'yet',
    'at', 'by', 'for', 'in', 'of', 'on', 'to', 'up', 'as',
    'from', 'into', 'like', 'near', 'over', 'past', 'per',
    'than', 'upon', 'with',
]);

/**
 * Converts an arbitrary string to title case.
 *
 * Rules:
 *  • Every word is capitalised, except short conjunctions/prepositions.
 *  • The first word is always capitalised regardless of the above.
 *  • Protected terms (e.g. SAN, FIRS, LTD) keep their canonical casing.
 *  • Handles hyphenated words by capitalising each segment.
 *  • null / undefined / empty strings return "".
 *
 * @example
 * toTitleCase("mr mike igbokwe SAN tax advisory")
 * // → "Mr Mike Igbokwe SAN Tax Advisory"
 *
 * toTitleCase("ego chinwuba and co (garnishee matters)")
 * // → "Ego Chinwuba and Co (Garnishee Matters)"
 *
 * toTitleCase("miss halimat akanni-shelle v. administrators of the estate")
 * // → "Miss Halimat Akanni-Shelle V. Administrators of the Estate"
 */
export function toTitleCase(text: string | null | undefined): string {
    if (!text) return '';

    const words = text.trim().split(/\s+/);

    return words
        .map((word, index) => {
            if (!word) return word;

            // Hyphenated words: capitalise each segment independently
            if (word.includes('-')) {
                return word
                    .split('-')
                    .map((seg, segIdx) => _titleCaseToken(seg, index === 0 && segIdx === 0))
                    .join('-');
            }

            return _titleCaseToken(word, index === 0);
        })
        .join(' ');
}

function _titleCaseToken(word: string, isFirst: boolean): string {
    if (!word) return word;

    const upper = word.toUpperCase();

    // Protected term — always use canonical form
    if (_PROTECTED_MAP.has(upper)) {
        return _PROTECTED_MAP.get(upper)!;
    }

    const lower = word.toLowerCase();

    // Short words stay lowercase unless they're the first word
    if (!isFirst && _LOWER_WORDS.has(lower)) {
        return lower;
    }

    // Preserve parentheses prefix, e.g. "(garnishee" → "(Garnishee"
    const parenMatch = lower.match(/^(\(+)(.*)$/);
    if (parenMatch) {
        const [, prefix, rest] = parenMatch;
        return prefix + rest.charAt(0).toUpperCase() + rest.slice(1);
    }

    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

// ─── Action-layer helpers ─────────────────────────────────────────────────────

/**
 * Returns a shallow copy of `obj` with the specified string fields
 * normalised to sentence case. Non-string / nullish values are left untouched.
 *
 * @example
 * const cleaned = applySentenceCaseToFields(data, ['name', 'description']);
 */
export function applySentenceCaseToFields<T extends object>(
    obj: T,
    fields: (keyof T)[]
): T {
    const result = { ...obj } as Record<string, unknown>;
    for (const field of fields) {
        const value = result[field as string];
        if (typeof value === 'string') {
            result[field as string] = toSentenceCase(value);
        }
    }
    return result as T;
}

/**
 * Returns a shallow copy of `obj` with the specified string fields
 * normalised to title case. Non-string / nullish values are left untouched.
 *
 * Use this for proper nouns: brief names, client names, company names.
 *
 * @example
 * const cleaned = applyTitleCaseToFields(data, ['name', 'company']);
 */
export function applyTitleCaseToFields<T extends object>(
    obj: T,
    fields: (keyof T)[]
): T {
    const result = { ...obj } as Record<string, unknown>;
    for (const field of fields) {
        const value = result[field as string];
        if (typeof value === 'string') {
            result[field as string] = toTitleCase(value);
        }
    }
    return result as T;
}
