/**
 * Backfills CalendarEntry.appearances from court reports (Feb–Apr 2026).
 * Run dry-run first:  node scripts/backfill-appearances.js
 * Apply changes:      node scripts/backfill-appearances.js --apply
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const APPLY = process.argv.includes('--apply');

// ── Lawyer IDs ──────────────────────────────────────────────────────────────
const L = {
    sanni:    'cmle84fzl0005r9db0iw30bea', // Professor Abiola Sanni, SAN
    kola:     'cmle84gii0008r9db505o0fij', // Kola Abdulsalam
    iniobong: 'cmley10ap00044xm1rpb7iklr', // Iniobong Inieke Umoh
    josephine:'cmley171e00074xm1bet33ll9', // Josephine Ogbinaka
    maureen:  'cmley1rzq000d4xm1j98mqwk7', // Maureen Omaegbu
    adeola:   'cmley26zp000g4xm1jwxs7e4n', // Adeola Adeoye
    benjamin: 'cmley2mfu000j4xm1jhz7y1bv', // Benjamin Adeyanju
    bayo:     'cmle84eff0000r9dbkqulwcku', // Adebayo Gbadebo
};

// ── Matter IDs ───────────────────────────────────────────────────────────────
const M = {
    elbethel_elijah:  'cmoa1on9v000v14n343btamjr', // Elbethel v. Elijah Ogunleye (Orile)
    ikeja_electric:   'cmoa1orr8001314n3b8md9rrn', // Ikeja Electric v. NERC & Ors
    akanni_shelle:    'cmlfct4oq000f3htwobxsrsgd', // Akanni Shelle v. Akanni Shelle
    elbethel_shokoya: 'cmlgq01xg000114e7zxytra7a', // ELBETHEL V SHOKOYA
    owolabi:          'cmoa1oye2001f14n3e0kl85t9', // Owolabi v. Oriolowo
    kanu_emodi:       'cmlgpkgrg0031uuvqiifotltt', // KANU V EMODI (HC)
    keystone:         'cmlgopovi001i11vjkfhc1xhp', // State of Lagos v. Keystone Bank
    akinyele:         'cmoa1ouzx001914n3wkftbvrl', // Akinyele v. Pendragon & Ors
    akintan:          'cmlgovmli003011vjoebq887o', // Akintan and ors v. OAUTHC
    adedire:          'cmoa1p637001r14n386ayhqxu', // Adedire Caroline v. OAUTHC
    johnson_odion:    'cmoa1p8p7001v14n3kkclphi9', // Johnson Odion v. Edo State (Garnishee)
    adegbite:         'cmlgohsar000311vjt7dqmllx', // Adegbite Gabriel v. OAUTHC
    church_god:       'cmoa1pdq7002314n3nx4cdveh', // Church of God v. CAC & Anor
    adisa:            'cmoa1p14m001j14n37jggsfwp', // Adisa Muyiwa Mohammed v. Customs
    reachout:         'cmoa1p3jf001n14n3qyq9cxig', // Reachout Housing v. Awodun
    igp_okocha:       'cmlgpc8op0003uuvqkbrzrp3f', // IGP v. Felix Okocha & 2 Ors
    state_taiwo:      'cmlgpob94004juuvq66lvl91x', // State v Taiwo Kolawole & 3 Ors
    taibat:           'cmoa1pg9n002714n3g7v19iex', // Taibat Lawanson v. Zenith (7th Garnishee)
    elizabeth_aminu:  'cmlgp3xjv001m15d7oj263sg6', // Elizabeth Aminu v. Babatope Ogunniyi
    renmoney:         'cmnq7wds00001fpzz20abyzgc', // Renmoney v. Ajere (Zenith 5th Garnishee)
};

// ── Appearance records extracted from court reports ──────────────────────────
// date: ISO string of the hearing date
// matterId: from M above
// lawyers: array of user IDs from L above (firm lawyers only)
// note: description for logging
const APPEARANCES = [
    // 6 February 2026 — Elbethel v Elijah (reported 19 Feb)
    { date: '2026-02-06', matterId: M.elbethel_elijah, lawyers: [L.adeola, L.maureen],
      note: 'Adeola Adeoye and Maureen Omaegbu for Claimants' },

    // 20 February 2026 — Ikeja Electric v NERC
    { date: '2026-02-20', matterId: M.ikeja_electric, lawyers: [L.kola, L.adeola],
      note: 'Kola Abdulsalam with Adeola Adeoye for 1st Defendant' },

    // 25 February 2026 — Akanni Shelle
    { date: '2026-02-25', matterId: M.akanni_shelle, lawyers: [L.kola],
      note: 'Kola Abdulsalam for 1st and 2nd Defendants' },

    // 26 February 2026 — Owolabi v Oriolowo
    { date: '2026-02-26', matterId: M.owolabi, lawyers: [L.adeola, L.benjamin],
      note: 'Adeola Adeoye and Benjamin Adeyanju for Defendants' },

    // 26 February 2026 — Kanu v Emodi (bayo = "I appeared")
    { date: '2026-02-26', matterId: M.kanu_emodi, lawyers: [L.bayo],
      note: 'Bayo (Adebayo Gbadebo) appeared for the Claimant' },

    // 2 March 2026 — Elbethel v Shokoya (Judgment for Claimant)
    { date: '2026-03-02', matterId: M.elbethel_shokoya, lawyers: [L.maureen],
      note: 'Maureen Omaegbu for the Claimant' },

    // 2 March 2026 — State of Lagos v Keystone Bank
    { date: '2026-03-02', matterId: M.keystone, lawyers: [L.josephine, L.bayo],
      note: 'J. Ogbinaka and A.D. Gbadebo for 2nd Defendant' },

    // 2 March 2026 — Akinyele v Pendragon
    { date: '2026-03-02', matterId: M.akinyele, lawyers: [L.iniobong, L.adeola],
      note: 'Mrs Iniobong Umoh with Adeola Adeoye for 4th Defendant' },

    // 3 March 2026 — Akintan v OAUTHC
    { date: '2026-03-03', matterId: M.akintan, lawyers: [L.kola, L.maureen],
      note: 'Kolawole Abdulsalam and Maureen Omaegbu for Claimants' },

    // 4 March 2026 — Elbethel v Elijah Ogunleye
    { date: '2026-03-04', matterId: M.elbethel_elijah, lawyers: [L.adeola, L.benjamin],
      note: 'Adeola Adeoye and Benjamin Adeyanju for Claimants' },

    // 6 March 2026 — IGP v Felix Okocha (watching brief for complainant)
    { date: '2026-03-06', matterId: M.igp_okocha, lawyers: [L.benjamin],
      note: 'Benjamin Adeyanju holding watching brief for complainant' },

    // 9 March 2026 — Adedire Caroline v OAUTHC
    { date: '2026-03-09', matterId: M.adedire, lawyers: [L.sanni, L.kola, L.maureen],
      note: 'Prof Abiola Sanni SAN, Kola Abdulsalam and Maureen Omaegbu for Claimants' },

    // 10 March 2026 — Johnson Odion v Edo State (Garnishee)
    { date: '2026-03-10', matterId: M.johnson_odion, lawyers: [L.bayo],
      note: 'A.D. Gbadebo for 1st Garnishee' },

    // 16 March 2026 — Adegbite Gabriel v OAUTHC
    { date: '2026-03-16', matterId: M.adegbite, lawyers: [L.kola, L.maureen],
      note: 'Kolawole Abdulsalam and Maureen Omaegbu for Claimant' },

    // 24 March 2026 — Church of God v CAC & Anor
    { date: '2026-03-24', matterId: M.church_god, lawyers: [L.iniobong],
      note: 'I.I. Umoh for 1st Defendant' },

    // 25 March 2026 — Ikeja Electric v NERC (written addresses)
    { date: '2026-03-25', matterId: M.ikeja_electric, lawyers: [L.kola, L.adeola],
      note: 'Kola Abdulsalam with Adeola Adeoye for 1st Defendant (written addresses adopted)' },

    // 31 March 2026 — Akinyele v Pendragon
    { date: '2026-03-31', matterId: M.akinyele, lawyers: [L.iniobong],
      note: 'Mrs Iniobong Umoh for 4th Defendant' },

    // 31 March 2026 — State v Taiwo Kolawole & 3 Ors
    { date: '2026-03-31', matterId: M.state_taiwo, lawyers: [L.kola, L.josephine],
      note: 'Kolawole Abdulsalam with Josephine Ogbinaka for 1st Defendant' },

    // 1 April 2026 — Taibat Lawanson v Zenith (7th Garnishee discharged)
    { date: '2026-04-01', matterId: M.taibat, lawyers: [L.bayo],
      note: 'A.D. Gbadebo for 7th Garnishee' },

    // 1 April 2026 — Kanu v Emodi (HC)
    { date: '2026-04-01', matterId: M.kanu_emodi, lawyers: [L.iniobong, L.maureen],
      note: 'I.I. Umoh and Maureen Omaegbu for Claimant (Prof FN Ndubuisi also appeared — not in system)' },

    // 7 April 2026 — Elizabeth Aminu v Babatope Ogunniyi
    { date: '2026-04-07', matterId: M.elizabeth_aminu, lawyers: [L.kola, L.maureen],
      note: 'Kola Abdulsalam and Maureen Omaegbu for Defendant' },

    // 8 April 2026 — Renmoney v Ajere (Zenith 5th Garnishee discharged)
    { date: '2026-04-08', matterId: M.renmoney, lawyers: [L.bayo],
      note: 'Adebayo Gbadebo in court for 5th Garnishee (Zenith Bank)' },

    // 13 April 2026 — State of Lagos v Keystone Bank
    { date: '2026-04-13', matterId: M.keystone, lawyers: [L.josephine, L.bayo],
      note: 'J. Ogbinaka and A.D. Gbadebo for 2nd Defendant — settlement reported' },

    // 13 April 2026 — Akanni Shelle v Akanni Shelle
    { date: '2026-04-13', matterId: M.akanni_shelle, lawyers: [L.kola, L.benjamin],
      note: 'Kola Abdulsalam with Benjamin Adeyanju for 1st and 2nd Defendants' },

    // 15 April 2026 — Elbethel v Elijah Ogunleye
    { date: '2026-04-15', matterId: M.elbethel_elijah, lawyers: [L.adeola, L.benjamin],
      note: 'Adeola Adeoye and Benjamin Adeyanju for Claimants' },
];

async function run() {
    console.log(`\n${APPLY ? '🟢 APPLY MODE' : '🔵 DRY RUN — pass --apply to save changes'}\n`);

    let matched = 0, missing = 0, updated = 0;

    for (const rec of APPEARANCES) {
        const dateStart = new Date(`${rec.date}T00:00:00.000Z`);
        const dateEnd   = new Date(`${rec.date}T23:59:59.999Z`);

        // Find CalendarEntry(ies) for this matter on this date
        const entries = await p.calendarEntry.findMany({
            where: {
                matterId: rec.matterId,
                date: { gte: dateStart, lte: dateEnd },
            },
            select: { id: true, date: true, title: true, type: true,
                      appearances: { select: { id: true, name: true } } },
        });

        if (entries.length === 0) {
            console.log(`  ⚠ NO ENTRY  ${rec.date}  [${rec.note}]`);
            missing++;
            continue;
        }

        for (const entry of entries) {
            const existingIds = new Set(entry.appearances.map(a => a.id));
            const alreadySet  = rec.lawyers.every(id => existingIds.has(id));

            if (alreadySet && entry.appearances.length === rec.lawyers.length) {
                console.log(`  ✓ SKIP     ${rec.date}  ${entry.title || entry.type || 'entry'} — already correct`);
                matched++;
                continue;
            }

            const lawyerNames = rec.lawyers.map(id =>
                Object.entries(L).find(([,v]) => v === id)?.[0] || id
            ).join(', ');

            console.log(`  ${APPLY ? '✅ UPDATE' : '→ WOULD UPDATE'}  ${rec.date}  ${entry.title || entry.type || 'entry'}`);
            console.log(`     Lawyers: ${lawyerNames}`);
            console.log(`     Note: ${rec.note}`);

            if (APPLY) {
                await p.calendarEntry.update({
                    where: { id: entry.id },
                    data: {
                        appearances: {
                            set: rec.lawyers.map(id => ({ id })),
                        },
                    },
                });
                updated++;
            } else {
                matched++;
            }
        }
    }

    console.log(`\n── Summary ──`);
    console.log(`  Matched/skipped: ${matched}`);
    console.log(`  Missing entries: ${missing}`);
    if (APPLY) console.log(`  Updated:         ${updated}`);
    console.log(`  Total records:   ${APPEARANCES.length}\n`);
}

run()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => p.$disconnect());
