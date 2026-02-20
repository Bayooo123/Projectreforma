#!/usr/bin/env node
/**
 * test-sentence-case.mjs
 *
 * Standalone unit tests for the toSentenceCase() logic.
 * No test framework required — just run: node scripts/test-sentence-case.mjs
 *
 * Uses the same pure-JS implementation as the utility (no TypeScript compilation needed).
 */

// ─── Inline implementation (mirrors src/lib/sentence-case.ts) ─────────────────
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

// ─── Test Runner ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(label, actual, expected) {
    if (actual === expected) {
        console.log(`  ✅ PASS  ${label}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL  ${label}`);
        console.error(`       Expected: "${expected}"`);
        console.error(`       Actual  : "${actual}"`);
        failed++;
    }
}

console.log('\n  REFORMA – Sentence Case Utility Tests\n  ══════════════════════════════════════\n');

// Basic conversion
assert(
    'ALL CAPS — brief name',
    toSentenceCase('HOTELLIERS ASSOCIATION OF OYO STATE V. AG OF OYO AND FIRS'),
    'Hotelliers association of OYO state V. Ag of OYO and FIRS'
);

assert(
    'ALL CAPS — short brief',
    toSentenceCase('ELBETHEL V SHOKOYA'),
    'Elbethel V shokoya'
);

assert(
    'Mixed case company name with PLC',
    toSentenceCase('AOU VENTURES LIMITED v. PEACE MARINE AND ENERGY LIMITED'),
    'Aou ventures limited V. Peace marine and energy limited'
);

// Protected terms
assert(
    'Protected: NDPA stays uppercase',
    toSentenceCase('under the NDPA and ASCOLP rules'),
    'Under the NDPA and ASCOLP rules'
);

assert(
    'Protected: FIRS stays uppercase mid-sentence',
    toSentenceCase('matter between company and FIRS'),
    'Matter between company and FIRS'
);

assert(
    'Protected: SAN qualification preserved',
    toSentenceCase('abiola sanni SAN'),
    'Abiola sanni SAN'
);

assert(
    'Protected: NGN preserved',
    toSentenceCase('payment of NGN 500000 made'),
    'Payment of NGN 500000 made'
);

// Multi-sentence
assert(
    'Multi-sentence: each sentence capitalised',
    toSentenceCase('MATTER OPENED. CLIENT APPEARED IN COURT.'),
    'Matter opened. Client appeared in court.'
);

assert(
    'Multi-sentence: second sentence also sentence-cased',
    toSentenceCase('proceedings recorded. adjourned to next date.'),
    'Proceedings recorded. Adjourned to next date.'
);

// Edge cases
assert('Null → empty string', toSentenceCase(null), '');
assert('Undefined → empty string', toSentenceCase(undefined), '');
assert('Empty string → empty string', toSentenceCase(''), '');
assert('Already sentence case — unchanged', toSentenceCase('Client appeared.'), 'Client appeared.');
assert(
    'Single word ALL CAPS',
    toSentenceCase('LITIGATION'),
    'Litigation'
);
assert(
    'Single word lowercase',
    toSentenceCase('litigation'),
    'Litigation'
);

// Legal case names (real ASCOLP data patterns)
assert(
    'Real data: State v Taiwo Kolawole',
    toSentenceCase('STATE V TAIWO KOLAWOLE & 3 ORS'),
    'State V taiwo kolawole & 3 ors'
);

assert(
    'Real data: Zenith Bank PLC',
    toSentenceCase('ZENITH BANK PLC'),
    'Zenith bank PLC'
);

// Summary
console.log(`\n  ══════════════════════════════════════`);
console.log(`  Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests.`);
if (failed > 0) {
    console.error('  ❌ Some tests failed. Please fix before deploying.\n');
    process.exit(1);
} else {
    console.log('  ✅ All tests passed.\n');
}
