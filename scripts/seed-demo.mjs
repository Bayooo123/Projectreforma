// Demo workspace seed script
// Target: Gbadebo, Usman and Okoro (dhaveedace@gmail.com)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const WS   = 'cmlzb1jgk0003nr6yojodo5tc';
const USER = 'cmlzb1jb10001nr6yg8vse1ub'; // Adebayo Gbadebo

// ── Helpers ──────────────────────────────────────────────────────────────────
const cuid = () => Math.random().toString(36).slice(2, 14) + Math.random().toString(36).slice(2, 14);
const daysAgo  = (n) => new Date(Date.now() - n * 86_400_000);
const daysFrom = (n) => new Date(Date.now() + n * 86_400_000);
const monthStart = (y, m) => new Date(y, m - 1, 1);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── Reference data ────────────────────────────────────────────────────────────
const CLIENTS = [
    { name: 'Alhaji Musa Abdullahi', email: 'musa.abdullahi@client.com', phone: '+2348031234567', company: 'Abdullahi Holdings Ltd' },
    { name: 'Mrs Ngozi Okonkwo',     email: 'ngozi.okonkwo@client.com',  phone: '+2348051234568', company: null },
    { name: 'Chief Emeka Okafor',    email: 'emeka.okafor@client.com',   phone: '+2348071234569', company: 'Okafor Group of Companies' },
    { name: 'Dr Amina Yusuf',        email: 'amina.yusuf@client.com',    phone: '+2347031234570', company: 'Yusuf Medical Centre' },
    { name: 'Engr Taiwo Adeyemi',    email: 'taiwo.adeyemi@client.com',  phone: '+2348091234571', company: 'Adeyemi Engineering Ltd' },
    { name: 'Barr Funke Balogun',    email: 'funke.balogun@client.com',  phone: '+2348011234572', company: null },
    { name: 'Mr Chukwuemeka Eze',    email: 'chukwuemeka.eze@client.com',phone: '+2348021234573', company: 'Eze Brothers Nig. Ltd' },
    { name: 'Princess Fatima Sule',  email: 'fatima.sule@client.com',    phone: '+2347041234574', company: 'Sule Estates Ltd' },
    { name: 'Dr Olumide Adesanya',   email: 'olumide.adesanya@client.com',phone: '+2348061234575', company: 'Adesanya & Associates' },
    { name: 'Mrs Blessing Ikenna',   email: 'blessing.ikenna@client.com', phone: '+2348081234576', company: null },
];

const CATEGORIES = ['Litigation', 'Corporate', 'Property', 'Employment', 'Family', 'Criminal', 'Commercial', 'Banking'];
const COURTS = [
    'Federal High Court, Lagos',
    'High Court of Lagos State',
    'Court of Appeal, Lagos Division',
    'Federal High Court, Abuja',
    'National Industrial Court',
    'High Court of FCT',
    'Magistrate Court, Lagos Island',
];
const PROCEEDING_TYPES = [
    'Hearing of Originating Motion',
    'Cross-examination of Witness',
    'Adoption of Final Written Address',
    'Ruling on Preliminary Objection',
    'Mention',
    'Settlement Conference',
    'Hearing of Motion on Notice',
    'Judgment',
    'Continuation of Trial',
    'Interlocutory Injunction Hearing',
];
const BRIEF_NAMES = [
    ['Suit re: Recovery of Debt', 'v. First Bank of Nigeria Plc'],
    ['Land Dispute', 'at Lekki Phase 2, Lagos'],
    ['Employment Termination Matter', '— Wrongful Dismissal Claim'],
    ['Corporate Restructuring Advisory', '— Merger & Acquisition'],
    ['Tenancy Recovery Proceedings', 'at Victoria Island'],
    ['Criminal Defence Brief', '— Money Laundering Allegation'],
    ['Intellectual Property Infringement', '— Trademark Dispute'],
    ['Winding Up Petition', 'against Zenith Enterprises Ltd'],
    ['Custody & Matrimonial Proceedings', '— Petition for Divorce'],
    ['Contract Dispute', '— Construction Agreement Breach'],
    ['Banking & Finance Advisory', '— Loan Restructuring'],
    ['Regulatory Compliance Advisory', '— SEC Registration'],
    ['Property Acquisition Advisory', '— Title Investigation'],
    ['Defamation Suit', '— Libel & Slander'],
    ['Insurance Claim Dispute', '— Marine Cargo'],
    ['Tax Dispute & Appeal', '— FIRS Assessment'],
    ['Constitutional Law Matter', '— Fundamental Rights Enforcement'],
    ['Probate & Estate Administration', '— Letters of Administration'],
    ['Admiralty Matter', '— Arrest of Vessel MV Calabar Star'],
    ['Commercial Tenancy Advisory', '— Victoria Island Office Complex'],
];

async function main() {
    console.log('🌱  Seeding demo workspace: Gbadebo, Usman and Okoro\n');

    // ── 1. Clients ─────────────────────────────────────────────────────────────
    console.log('Creating clients…');
    const clientRecords = [];
    for (const c of CLIENTS) {
        const rec = await prisma.client.create({
            data: { workspaceId: WS, name: c.name, email: c.email, phone: c.phone, company: c.company },
        });
        clientRecords.push(rec);
    }
    // Include pre-existing client
    const allClients = [...clientRecords, { id: 'cmlzb3khz0007nr6yntdxzpfw', name: 'Renaissance Oil Group' }];
    console.log(`  ✓ ${clientRecords.length} clients created\n`);

    // ── 2. Briefs + Matters ────────────────────────────────────────────────────
    console.log('Creating briefs and matters…');
    const matters = [];
    for (let i = 0; i < 20; i++) {
        const client   = allClients[i % allClients.length];
        const cat      = CATEGORIES[i % CATEGORIES.length];
        const [prefix, suffix] = BRIEF_NAMES[i];
        const name     = `${prefix} ${suffix}`;
        const briefNum = String(1001 + i);
        const isLit    = cat === 'Litigation' || cat === 'Criminal';
        const createdAt = daysAgo(180 - i * 8);

        let matter = null;
        if (isLit || Math.random() > 0.3) {
            const caseNum = `GUO/${2025 + Math.floor(i / 10)}/${String(100 + i).padStart(3, '0')}`;
            matter = await prisma.matter.create({
                data: {
                    workspaceId: WS,
                    name,
                    caseNumber:     caseNum,
                    clientId:       client.id,
                    court:          pick(COURTS),
                    judge:          pick(['Hon. Justice A. Ogunbiyi', 'Hon. Justice B. Adeyemi', 'Hon. Justice C. Ibrahim', 'Hon. Justice D. Okafor']),
                    status:         'active',
                    lawyerInChargeId: USER,
                    createdAt,
                    lastActivityAt: daysAgo(i * 3),
                },
            });
            matters.push(matter);
        }

        await prisma.brief.create({
            data: {
                workspaceId: WS,
                briefNumber: briefNum,
                name,
                category:    cat,
                status:      i < 17 ? 'active' : 'closed',
                clientId:    client.id,
                matterId:    matter?.id ?? null,
                lawyerId:    USER,
                lawyerInChargeId: USER,
                description: `This brief concerns ${prefix.toLowerCase()} on behalf of ${client.name}.`,
                createdAt,
            },
        });
    }
    console.log(`  ✓ 20 briefs created, ${matters.length} matters created\n`);

    // ── 3. Court dates (CalendarEntry) ────────────────────────────────────────
    console.log('Creating court dates…');
    let courtCount = 0;
    const usedMatters = matters.slice(0, 14); // Use first 14 matters

    // 10 past hearings (with outcomes)
    for (let i = 0; i < 10; i++) {
        const m = usedMatters[i];
        const pastDate = daysAgo(5 + i * 12);
        await prisma.calendarEntry.create({
            data: {
                matterId:   m.id,
                date:       pastDate,
                type:       'COURT',
                court:      m.court,
                judge:      pick(['Hon. Justice A. Ogunbiyi', 'Hon. Justice B. Adeyemi', 'Hon. Justice C. Ibrahim', 'Hon. Justice D. Okafor']),
                proceedings: pick(PROCEEDING_TYPES),
                outcome:    pick([
                    'Matter adjourned for further hearing',
                    'Ruling delivered in favour of applicant',
                    'Witness cross-examination concluded, matter stood down',
                    'Final written address adopted, judgment reserved',
                    'Interlocutory injunction granted pending substantive suit',
                    'Parties directed to file further affidavit',
                ]),
            },
        });
        courtCount++;
    }

    // 4 past hearings without outcomes (triggers anomaly detection)
    for (let i = 0; i < 4; i++) {
        const m = usedMatters[10 + i];
        await prisma.calendarEntry.create({
            data: {
                matterId:   m.id,
                date:       daysAgo(3 + i * 7),
                type:       'COURT',
                court:      m.court,
                proceedings: pick(PROCEEDING_TYPES),
                // No outcome — intentional for anomaly demo
            },
        });
        courtCount++;
    }

    // 6 upcoming hearings
    for (let i = 0; i < 6; i++) {
        const m = usedMatters[i];
        await prisma.calendarEntry.create({
            data: {
                matterId:   m.id,
                date:       daysFrom(7 + i * 14),
                type:       'COURT',
                court:      m.court,
                judge:      pick(['Hon. Justice A. Ogunbiyi', 'Hon. Justice B. Adeyemi', 'Hon. Justice C. Ibrahim', 'Hon. Justice D. Okafor']),
                proceedings: pick(PROCEEDING_TYPES),
            },
        });
        courtCount++;
    }
    console.log(`  ✓ ${courtCount} court dates created\n`);

    // ── 4. Expenses (4 months: Jan–Apr 2026) ──────────────────────────────────
    console.log('Creating expenses…');
    const expenseMonths = [
        { y: 2026, m: 1 },
        { y: 2026, m: 2 },
        { y: 2026, m: 3 },
        { y: 2026, m: 4 },
    ];
    let expenseCount = 0;
    for (const { y, m } of expenseMonths) {
        const entries = [
            { category: 'STAFF_COSTS',                  amount: 850000,  desc: 'Monthly staff salaries and allowances',           ref: `PAY-${y}${String(m).padStart(2,'0')}` },
            { category: 'OFFICE_UTILITIES',              amount: 120000,  desc: 'Office rent, electricity and water bills',        ref: `UTL-${y}${String(m).padStart(2,'0')}` },
            { category: 'COURT_LITIGATION',              amount: 45000,   desc: 'Court filing fees and process server fees',       ref: `CRT-${y}${String(m).padStart(2,'0')}` },
            { category: 'VEHICLE_LOGISTICS',             amount: 65000,   desc: 'Vehicle fuelling, maintenance and logistics',     ref: `VEH-${y}${String(m).padStart(2,'0')}` },
            { category: 'COMMUNICATION_SUBSCRIPTIONS',  amount: 38000,   desc: 'Internet, phone lines and software subscriptions',ref: `COM-${y}${String(m).padStart(2,'0')}` },
            { category: 'OFFICE_EQUIPMENT_MAINTENANCE', amount: 28000,   desc: 'Printer servicing, computer repairs',             ref: `EQP-${y}${String(m).padStart(2,'0')}` },
            { category: 'NON_LITIGATION_ADVISORY',      amount: 15000,   desc: 'External advisory and consultancy fees',          ref: `ADV-${y}${String(m).padStart(2,'0')}` },
            { category: 'MISCELLANEOUS',                 amount: 22000,   desc: 'Miscellaneous office expenses',                   ref: `MSC-${y}${String(m).padStart(2,'0')}` },
        ];
        for (const e of entries) {
            const day = Math.floor(Math.random() * 25) + 1;
            await prisma.expense.create({
                data: {
                    workspaceId: WS,
                    amount:      e.amount,
                    category:    e.category,
                    description: e.desc,
                    reference:   e.ref,
                    date:        new Date(y, m - 1, day),
                },
            });
            expenseCount++;
        }
    }
    console.log(`  ✓ ${expenseCount} expense entries created across 4 months\n`);

    // ── 5. Revenue — Invoices (5 months: Dec 2025–Apr 2026) ───────────────────
    console.log('Creating invoices (revenue)…');
    const revenueMonths = [
        { y: 2025, m: 12 },
        { y: 2026, m: 1 },
        { y: 2026, m: 2 },
        { y: 2026, m: 3 },
        { y: 2026, m: 4 },
    ];
    let invoiceCount = 0;
    let invSeq = 1;

    const invoiceTemplates = [
        { desc: 'Professional fees — litigation representation',     amount: 500000 },
        { desc: 'Retainer fee — corporate advisory services',        amount: 350000 },
        { desc: 'Professional fees — property transaction',          amount: 280000 },
        { desc: 'Legal fees — contract drafting and review',         amount: 180000 },
        { desc: 'Professional fees — employment matter',             amount: 220000 },
        { desc: 'Retainer fee — general legal advisory',             amount: 150000 },
        { desc: 'Success fee — debt recovery',                       amount: 750000 },
        { desc: 'Professional fees — regulatory advisory',           amount: 320000 },
        { desc: 'Legal fees — due diligence services',               amount: 240000 },
        { desc: 'Professional fees — ADR/mediation',                 amount: 190000 },
    ];

    for (const { y, m } of revenueMonths) {
        // 3–4 invoices per month
        const count = m % 2 === 0 ? 3 : 4;
        for (let j = 0; j < count; j++) {
            const client   = allClients[(invSeq + j) % allClients.length];
            const tmpl     = invoiceTemplates[(invSeq + j) % invoiceTemplates.length];
            const matter   = matters[(invSeq + j) % Math.max(matters.length, 1)];
            const invNum   = `GUO-INV-${y}-${String(invSeq).padStart(3, '0')}`;
            const day      = Math.floor(Math.random() * 24) + 1;
            const invDate  = new Date(y, m - 1, day);
            const dueDate  = new Date(y, m - 1, day + 30);
            const subtotal = tmpl.amount;
            const vatAmt   = Math.round(subtotal * 0.075);
            const secAmt   = Math.round(subtotal * 0.01);
            const total    = subtotal + vatAmt + secAmt;
            // Older invoices are paid; recent ones are pending/overdue
            const monthsOld = (2026 - y) * 12 + (4 - m);
            const status   = monthsOld >= 3 ? 'paid' : monthsOld >= 1 ? pick(['paid', 'pending']) : 'pending';

            const invoice = await prisma.invoice.create({
                data: {
                    invoiceNumber: invNum,
                    clientId:      client.id,
                    matterId:      matter?.id ?? null,
                    date:          invDate,
                    dueDate,
                    status,
                    billToName:    client.name,
                    subtotal,
                    vatRate:       7.5,
                    vatAmount:     vatAmt,
                    securityChargeRate:   1.0,
                    securityChargeAmount: secAmt,
                    totalAmount:   total,
                    notes: `Invoice for legal services rendered in ${invDate.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}.`,
                    items: {
                        create: [{ description: tmpl.desc, amount: subtotal, quantity: 1, order: 0 }],
                    },
                },
            });

            // Create payment record for paid invoices
            if (status === 'paid') {
                const payDate = new Date(dueDate.getTime() - Math.random() * 20 * 86_400_000);
                await prisma.payment.create({
                    data: {
                        clientId:  client.id,
                        invoiceId: invoice.id,
                        amount:    total,
                        date:      payDate,
                        method:    pick(['Bank Transfer', 'Cheque', 'Cash']),
                        reference: `PAY-${invNum}`,
                    },
                });
            }

            invoiceCount++;
            invSeq++;
        }
    }
    console.log(`  ✓ ${invoiceCount} invoices created across 5 months\n`);

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('━'.repeat(50));
    console.log('✅  Seed complete!');
    console.log(`   Clients:   ${clientRecords.length}`);
    console.log(`   Briefs:    20`);
    console.log(`   Matters:   ${matters.length}`);
    console.log(`   Court dates: ${courtCount}`);
    console.log(`   Expenses:  ${expenseCount} entries (4 months)`);
    console.log(`   Invoices:  ${invoiceCount} (5 months)`);
    console.log('━'.repeat(50));
}

main()
    .catch(e => { console.error('❌  Seed failed:', e.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
