// Demo workspace seed — additive v2
// Adds: ~₦244M more revenue, ~₦70M more expenses, 20 briefs, 30 court dates
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const WS   = 'cmlzb1jgk0003nr6yojodo5tc';
const USER = 'cmlzb1jb10001nr6yg8vse1ub';

const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand  = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const daysAgo  = (n) => new Date(Date.now() - n * 86_400_000);
const daysFrom = (n) => new Date(Date.now() + n * 86_400_000);

// ── Reference data ────────────────────────────────────────────────────────────
const COURTS = [
    'Federal High Court, Lagos',
    'High Court of Lagos State',
    'Court of Appeal, Lagos Division',
    'Federal High Court, Abuja',
    'National Industrial Court',
    'High Court of FCT',
    'Court of Appeal, Abuja Division',
    'Supreme Court of Nigeria',
    'Investment & Securities Tribunal',
];
const JUDGES = [
    'Hon. Justice A. Ogunbiyi',
    'Hon. Justice B. Adeyemi',
    'Hon. Justice C. Ibrahim',
    'Hon. Justice D. Okafor',
    'Hon. Justice E. Nwosu',
    'Hon. Justice F. Aliyu',
];
const PROCEEDINGS = [
    'Hearing of Originating Motion',
    'Cross-examination of Witness',
    'Adoption of Final Written Address',
    'Ruling on Preliminary Objection',
    'Mention',
    'Settlement Conference',
    'Hearing of Motion on Notice',
    'Continuation of Trial',
    'Interlocutory Injunction Hearing',
    'Hearing of Counter-Affidavit',
    'Further Hearing',
    'Ruling on No-Case Submission',
    'Examination of Witness',
    'Hearing of Application for Stay',
    'Oral Argument on Appeal',
];
const OUTCOMES = [
    'Matter adjourned for further hearing — parties directed to exchange further affidavits',
    'Ruling delivered in favour of applicant; respondent ordered to file response within 14 days',
    'Witness cross-examination concluded; matter stood down for adoption of addresses',
    'Final written address adopted; judgment reserved for a date to be communicated',
    'Interlocutory injunction granted pending determination of substantive suit',
    'Preliminary objection dismissed; substantive hearing to commence next adjourned date',
    'Matter adjourned at parties\' request — settlement negotiations ongoing',
    'Partial judgment delivered; outstanding reliefs to be determined at next sitting',
    'No-case submission dismissed; defence directed to open its case',
    'Appeal allowed in part; matter remitted to trial court for reassessment of damages',
    'Consent judgment entered in favour of claimant for the agreed sum',
    'Court ordered parties to file additional documents by next adjourned date',
];
const NEW_BRIEF_NAMES = [
    ['Aviation Finance Advisory', '— Aircraft Acquisition & Leasing'],
    ['Mining Rights Dispute',     '— Solid Minerals Licence Challenge'],
    ['Oil & Gas Arbitration',     '— PSC Contractual Dispute'],
    ['PENCOM Regulatory Advisory','— Pension Fund Compliance'],
    ['Merger & Acquisition',      '— Takeover of Eko Holdings Ltd'],
    ['Capital Market Transaction','— Bond Issuance Programme Advisory'],
    ['Environmental Liability',   '— Oil Spill Remediation Claim'],
    ['Data Protection Advisory',  '— NDPC Compliance Review'],
    ['Franchise Agreement',       '— International Brand Entry'],
    ['Government Procurement',    '— Bid Protest & Challenge'],
    ['Fintech Regulatory',        '— CBN Licence Application'],
    ['Power Sector Advisory',     '— NERC Licence & Privatisation'],
    ['Real Estate Securitisation','— REIT Structure Advisory'],
    ['Immigration Advisory',      '— Expatriate Quota & CERPAC'],
    ['Criminal Defence',          '— EFCC Investigation & Arraignment'],
    ['Appeals Brief',             '— Court of Appeal — Commercial Division'],
    ['Anti-dumping Proceedings',  '— NEPC Trade Dispute'],
    ['Insolvency & Receivership', '— Appointment of Receiver Manager'],
    ['Broadcasting Licence',      '— NBC Regulatory Compliance'],
    ['Technology Transactions',   '— Software Licensing & IP Assignment'],
];
const CATEGORIES = ['Litigation','Corporate','Property','Employment','Finance','Criminal','Commercial','Regulatory','Banking','Energy'];

// ── Invoice templates: large realistic Nigerian law firm billings ──────────
// (amounts in Naira, no VAT — script adds VAT on top)
const BIG_INVOICES = [
    { desc: 'Professional fees — M&A transaction advisory (Eko Holdings acquisition)',             amount: 75_000_000 },
    { desc: 'Professional fees — oil & gas PSC arbitration (full phase)',                          amount: 60_000_000 },
    { desc: 'Retainer & transaction fees — capital market bond issuance programme',                amount: 48_000_000 },
    { desc: 'Professional fees — aviation finance, aircraft acquisition advisory',                 amount: 42_000_000 },
    { desc: 'Success fee — major debt recovery matter (Renaissance Oil Group)',                    amount: 38_000_000 },
    { desc: 'Professional fees — power sector privatisation advisory (NERC)',                      amount: 35_000_000 },
    { desc: 'Professional fees — REIT structuring and capital raising advisory',                   amount: 30_000_000 },
    { desc: 'Professional fees — insolvency & receivership proceedings',                           amount: 28_000_000 },
    { desc: 'Professional fees — Supreme Court appeal (commercial division)',                      amount: 25_000_000 },
    { desc: 'Retainer fee — Q3 2025 general legal advisory services',                              amount: 22_000_000 },
    { desc: 'Professional fees — environmental liability litigation (oil spill claim)',             amount: 20_000_000 },
    { desc: 'Professional fees — EFCC criminal defence and prosecution advisory',                  amount: 18_000_000 },
    { desc: 'Retainer fee — Q4 2025 corporate advisory and transaction support',                   amount: 16_000_000 },
    { desc: 'Professional fees — fintech CBN licence application and regulatory advisory',         amount: 15_000_000 },
    { desc: 'Professional fees — Court of Appeal litigation — constitutional matter',              amount: 14_000_000 },
    { desc: 'Professional fees — mining rights dispute and solid minerals advisory',               amount: 13_000_000 },
    { desc: 'Professional fees — PENCOM pension fund compliance review',                           amount: 12_000_000 },
    { desc: 'Professional fees — anti-dumping proceedings and trade dispute resolution',            amount: 10_000_000 },
    { desc: 'Professional fees — data protection NDPC compliance and regulatory advisory',         amount: 9_000_000 },
    { desc: 'Retainer fee — Q1 2026 general legal advisory services',                              amount: 8_500_000 },
    { desc: 'Professional fees — real estate securitisation and structured finance advisory',       amount: 8_000_000 },
    { desc: 'Professional fees — government procurement bid protest and challenge',                 amount: 7_500_000 },
    { desc: 'Professional fees — franchise agreement and international brand entry advisory',       amount: 6_500_000 },
    { desc: 'Professional fees — immigration advisory, expatriate quota and CERPAC',               amount: 5_500_000 },
    { desc: 'Professional fees — broadcasting licence advisory and NBC regulatory compliance',     amount: 5_000_000 },
    { desc: 'Professional fees — technology transactions, IP assignment and software licensing',   amount: 4_500_000 },
    { desc: 'Professional fees — admiralty matter (arrest and release of MV Calabar Star)',        amount: 18_000_000 },
    { desc: 'Retainer fee — Q2 2026 general legal advisory and litigation support',                amount: 7_000_000 },
    { desc: 'Professional fees — winding up petition and related corporate restructuring',         amount: 12_000_000 },
    { desc: 'Professional fees — tenancy recovery proceedings (Victoria Island portfolio)',        amount: 6_000_000 },
];

// Month buckets: [year, month, array of invoice indices from BIG_INVOICES]
const MONTHLY_PLAN = [
    { y: 2025, m: 5,  invs: [0, 9],         },  // May 2025:  75M + 22M = ~97M → trim
    { y: 2025, m: 6,  invs: [1, 13],        },  // Jun 2025:  60M + 15M
    { y: 2025, m: 7,  invs: [2, 14, 22],    },  // Jul 2025:  48M + 14M + 6.5M
    { y: 2025, m: 8,  invs: [3, 15],        },  // Aug 2025:  42M + 13M
    { y: 2025, m: 9,  invs: [4, 16, 23],    },  // Sep 2025:  38M + 12M + 5.5M
    { y: 2025, m: 10, invs: [5, 17, 24],    },  // Oct 2025:  35M + 10M + 5M
    { y: 2025, m: 11, invs: [6, 18, 25],    },  // Nov 2025:  30M + 9M + 4.5M
    { y: 2025, m: 12, invs: [26, 12],       },  // Dec 2025:  18M + 16M (supplements existing)
    { y: 2026, m: 1,  invs: [19, 29],       },  // Jan 2026:  8.5M + 6M
    { y: 2026, m: 2,  invs: [7, 20],        },  // Feb 2026:  28M + 8M
    { y: 2026, m: 3,  invs: [8, 21],        },  // Mar 2026:  25M + 7.5M
    { y: 2026, m: 4,  invs: [27, 11, 28],   },  // Apr 2026:  7M + 18M + 12M
];

async function main() {
    console.log('🌱  Seeding demo workspace v2 — adding revenue, expenses, briefs, court dates\n');

    // Load existing clients and matters
    const clients = await prisma.client.findMany({ where: { workspaceId: WS }, select: { id: true, name: true } });
    const matters = await prisma.matter.findMany({ where: { workspaceId: WS }, select: { id: true, name: true, court: true } });
    console.log(`  Found ${clients.length} clients, ${matters.length} matters\n`);

    // ── 1. Revenue invoices ────────────────────────────────────────────────────
    console.log('Creating invoices…');
    let invSeq = 35; // start after existing GUO-INV-YYYY-001 to 034
    let invCount = 0;
    let invTotal = 0;

    for (const { y, m, invs } of MONTHLY_PLAN) {
        for (const idx of invs) {
            const tmpl   = BIG_INVOICES[idx];
            const client = clients[invSeq % clients.length];
            const matter = matters.length ? matters[invSeq % matters.length] : null;
            const day    = rand(1, 24);
            const invDate  = new Date(y, m - 1, day);
            const dueDate  = new Date(y, m - 1, day + 30);
            const subtotal = tmpl.amount;
            const vatAmt   = Math.round(subtotal * 0.075);
            const secAmt   = Math.round(subtotal * 0.01);
            const total    = subtotal + vatAmt + secAmt;
            const invNum   = `GUO-INV-${y}-${String(invSeq).padStart(3, '0')}`;
            const now      = new Date();
            const monthsOld = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
            const status   = monthsOld >= 3 ? 'paid' : monthsOld >= 1 ? pick(['paid', 'pending']) : 'pending';

            const invoice = await prisma.invoice.create({
                data: {
                    invoiceNumber: invNum,
                    clientId:  client.id,
                    matterId:  matter?.id ?? null,
                    date:      invDate,
                    dueDate,
                    status,
                    billToName: client.name,
                    subtotal,
                    vatRate: 7.5,
                    vatAmount: vatAmt,
                    securityChargeRate: 1.0,
                    securityChargeAmount: secAmt,
                    totalAmount: total,
                    notes: `Invoice for legal services rendered — ${invDate.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}.`,
                    items: {
                        create: [{ description: tmpl.desc, amount: subtotal, quantity: 1, order: 0 }],
                    },
                },
            });

            if (status === 'paid') {
                const payDate = new Date(dueDate.getTime() - rand(1, 20) * 86_400_000);
                await prisma.payment.create({
                    data: {
                        clientId:  client.id,
                        invoiceId: invoice.id,
                        amount:    total,
                        date:      payDate,
                        method:    pick(['Bank Transfer', 'RTGS', 'Cheque']),
                        reference: `PAY-${invNum}`,
                    },
                });
            }

            invTotal += total;
            invCount++;
            invSeq++;
        }
    }
    console.log(`  ✓ ${invCount} invoices created — subtotal ₦${(invTotal / 1_000_000).toFixed(1)}M added\n`);

    // ── 2. Expenses (May 2025 – Apr 2026, 12 months, larger amounts) ──────────
    console.log('Creating expenses…');
    const expMonths = [];
    for (let y = 2025, m = 5; !(y === 2026 && m === 5); m++) {
        if (m > 12) { m = 1; y++; }
        expMonths.push({ y, m });
    }

    let expCount = 0;
    let expTotal = 0;
    for (const { y, m } of expMonths) {
        const isQ4 = m >= 10; // year-end slightly higher
        const mul  = isQ4 ? 1.15 : 1.0;
        const entries = [
            { cat: 'STAFF_COSTS',                 amt: Math.round(2_800_000 * mul),  desc: `Staff salaries and associate fees — ${new Date(y, m-1).toLocaleDateString('en-NG',{month:'long',year:'numeric'})}`,       ref: `SAL-${y}${String(m).padStart(2,'0')}` },
            { cat: 'STAFF_COSTS',                 amt: Math.round(650_000 * mul),    desc: 'Staff allowances, PAYE taxes and pension contributions',                                                                     ref: `PEN-${y}${String(m).padStart(2,'0')}` },
            { cat: 'OFFICE_UTILITIES',            amt: Math.round(780_000 * mul),    desc: 'Office rent instalment, electricity, water and generator diesel',                                                           ref: `UTL-${y}${String(m).padStart(2,'0')}` },
            { cat: 'COURT_LITIGATION',            amt: Math.round(320_000 * mul),    desc: 'Court filing fees, Sheriff fees and process server expenses',                                                               ref: `CRT-${y}${String(m).padStart(2,'0')}` },
            { cat: 'VEHICLE_LOGISTICS',           amt: Math.round(430_000 * mul),    desc: 'Vehicle maintenance, fuel and courier/dispatch logistics',                                                                  ref: `VEH-${y}${String(m).padStart(2,'0')}` },
            { cat: 'COMMUNICATION_SUBSCRIPTIONS', amt: Math.round(185_000 * mul),    desc: 'Internet bandwidth, mobile lines, Zoom Pro and productivity subscriptions',                                                ref: `COM-${y}${String(m).padStart(2,'0')}` },
            { cat: 'OFFICE_EQUIPMENT_MAINTENANCE',amt: Math.round(145_000 * mul),    desc: 'Printer consumables, computer hardware repairs and office equipment servicing',                                            ref: `EQP-${y}${String(m).padStart(2,'0')}` },
            { cat: 'NON_LITIGATION_ADVISORY',     amt: Math.round(220_000 * mul),    desc: 'External consultancy fees, bar association subscriptions and CPD costs',                                                   ref: `ADV-${y}${String(m).padStart(2,'0')}` },
            { cat: 'MISCELLANEOUS',               amt: Math.round(180_000 * mul),    desc: 'Sundry office expenses, petty cash and staff welfare',                                                                     ref: `MSC-${y}${String(m).padStart(2,'0')}` },
        ];
        for (const e of entries) {
            await prisma.expense.create({
                data: {
                    workspaceId: WS,
                    amount:      e.amt,
                    category:    e.cat,
                    description: e.desc,
                    reference:   e.ref,
                    date:        new Date(y, m - 1, rand(1, 25)),
                },
            });
            expTotal += e.amt;
            expCount++;
        }
    }
    console.log(`  ✓ ${expCount} expense entries — added ₦${(expTotal / 1_000_000).toFixed(1)}M across 12 months\n`);

    // ── 3. 20 new briefs ───────────────────────────────────────────────────────
    console.log('Creating 20 new briefs…');
    const newMatters = [];
    for (let i = 0; i < 20; i++) {
        const client = clients[i % clients.length];
        const cat    = CATEGORIES[i % CATEGORIES.length];
        const [prefix, suffix] = NEW_BRIEF_NAMES[i];
        const name   = `${prefix} ${suffix}`;
        const briefNum = String(1041 + i);
        const isLit  = ['Litigation', 'Criminal', 'Finance', 'Energy'].includes(cat);
        const createdAt = daysAgo(rand(10, 160));

        let matter = null;
        if (isLit || Math.random() > 0.35) {
            const caseNum = `GUO/2026/${String(200 + i).padStart(3, '0')}`;
            matter = await prisma.matter.create({
                data: {
                    workspaceId: WS,
                    name,
                    caseNumber:   caseNum,
                    clientId:     client.id,
                    court:        pick(COURTS),
                    judge:        pick(JUDGES),
                    status:       'active',
                    lawyerInChargeId: USER,
                    createdAt,
                    lastActivityAt: daysAgo(rand(1, 30)),
                },
            });
            newMatters.push(matter);
        }

        await prisma.brief.create({
            data: {
                workspaceId: WS,
                briefNumber: briefNum,
                name,
                category:   cat,
                status:     'active',
                clientId:   client.id,
                matterId:   matter?.id ?? null,
                lawyerId:   USER,
                lawyerInChargeId: USER,
                description: `${prefix.trim()} — acting for ${client.name}.`,
                createdAt,
            },
        });
    }
    console.log(`  ✓ 20 briefs created, ${newMatters.length} new matters\n`);

    // ── 4. 30 court dates (mix of hearings + adjournments) ────────────────────
    console.log('Creating 30 court dates…');
    const allMatters = [...matters, ...newMatters];
    let courtCount = 0;

    // Build a timeline per matter: past chain → upcoming
    // 12 matters get a full hearing chain (3 dates each = 36 → trim to 30)
    const hearingChains = [
        // matter index, dates relative to today (negative = past, positive = future)
        { mi: 0,  chain: [-90, -45, 30] },
        { mi: 1,  chain: [-120, -60, -20] },   // no upcoming — triggers UNSCHEDULED_MATTER
        { mi: 2,  chain: [-80, -35, 21] },
        { mi: 3,  chain: [-100, -50, -8] },     // last hearing 8 days ago, no outcome
        { mi: 4,  chain: [-70, -25, 42] },
        { mi: 5,  chain: [-60, 14] },
        { mi: 6,  chain: [-110, -55, -12, 35] },
        { mi: 7,  chain: [-95, -40, 28] },
        { mi: 8,  chain: [-75, 56] },
        { mi: 9,  chain: [-130, -65, -15] },    // no upcoming
        { mi: 10, chain: [-85, -30, 21] },
    ];

    for (const { mi, chain } of hearingChains) {
        const m = allMatters[mi % allMatters.length];
        for (let c = 0; c < chain.length; c++) {
            const offset  = chain[c];
            const isPast  = offset < 0;
            const isVeryRecent = offset < 0 && offset > -10; // last hearing, no outcome yet

            await prisma.calendarEntry.create({
                data: {
                    matterId:    m.id,
                    date:        offset < 0 ? daysAgo(-offset) : daysFrom(offset),
                    type:        'COURT',
                    court:       m.court ?? pick(COURTS),
                    judge:       pick(JUDGES),
                    proceedings: pick(PROCEEDINGS),
                    // Past hearings get outcomes, except very recent ones (anomaly demo)
                    outcome: isPast && !isVeryRecent ? pick(OUTCOMES) : undefined,
                    // Adjournment note on all but last in chain
                    adjournedFor: isPast && c < chain.length - 1
                        ? `Adjourned — ${pick(['further hearing', 'adoption of final written address', 'cross-examination', 'ruling', 'settlement conference'])}`
                        : undefined,
                },
            });
            courtCount++;
            if (courtCount >= 30) break;
        }
        if (courtCount >= 30) break;
    }
    console.log(`  ✓ ${courtCount} court dates created (hearings + adjournments)\n`);

    // ── Final totals ──────────────────────────────────────────────────────────
    const [finalInv, finalExp, finalBriefs, finalCourts] = await Promise.all([
        prisma.invoice.aggregate({ where: { client: { workspaceId: WS } }, _sum: { totalAmount: true }, _count: true }),
        prisma.expense.aggregate({ where: { workspaceId: WS }, _sum: { amount: true }, _count: true }),
        prisma.brief.count({ where: { workspaceId: WS } }),
        prisma.calendarEntry.count({ where: { matter: { workspaceId: WS } } }),
    ]);

    console.log('━'.repeat(55));
    console.log('✅  Seed v2 complete — workspace totals now:');
    console.log(`   Total revenue:     ₦${(Number(finalInv._sum.totalAmount) / 1_000_000).toFixed(1)}M (${finalInv._count} invoices)`);
    console.log(`   Total expenses:    ₦${(Number(finalExp._sum.amount)      / 1_000_000).toFixed(1)}M (${finalExp._count} entries)`);
    console.log(`   Total briefs:      ${finalBriefs}`);
    console.log(`   Total court dates: ${finalCourts}`);
    console.log('━'.repeat(55));
}

main()
    .catch(e => { console.error('❌  Seed failed:', e.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
