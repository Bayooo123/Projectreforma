/**
 * One-time backlog script — Feb to May 2026 proceedings
 * Run: node scripts/proceedings-backlog.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WS_ID  = 'cmle84eye0002r9dbovl388l8';
const USER_ID = 'cmle84eff0000r9dbkqulwcku';

const d = (y, m, day) => new Date(Date.UTC(y, m - 1, day));

let entriesCreated = 0;
let mattersCreated = 0;
let mattersUpdated = 0;

async function getDefaultClientId() {
    const c = await prisma.client.findFirst({
        where: { workspaceId: WS_ID },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
    });
    if (!c) throw new Error('No clients in workspace');
    return c.id;
}

async function logHearing(matterId, hearingDate, proceedings, adjournedFor, adjournedTo, court) {
    await prisma.calendarEntry.create({
        data: {
            matterId,
            date: hearingDate,
            type: 'COURT',
            proceedings: proceedings || null,
            adjournedFor: adjournedFor || null,
            adjournedTo: adjournedTo || null,
            court: court || null,
            submittingLawyerId: USER_ID,
        },
    });
    entriesCreated++;
}

async function setNextDate(matterId, nextDate, status) {
    await prisma.matter.update({
        where: { id: matterId },
        data: {
            nextCourtDate: nextDate ?? null,
            ...(status ? { status } : {}),
        },
    });
    mattersUpdated++;
}

async function newMatter(name, court, judge, nextDate, status = 'active') {
    const clientId = await getDefaultClientId();
    const m = await prisma.matter.create({
        data: {
            workspaceId: WS_ID,
            clientId,
            lawyerInChargeId: USER_ID,
            name,
            court: court || null,
            judge: judge || null,
            nextCourtDate: nextDate || null,
            status,
        },
    });
    mattersCreated++;
    return m.id;
}

// ═══════════════════════════════════════════════════════════════════════
// PART 1 — UPDATE EXISTING MATTERS
// ═══════════════════════════════════════════════════════════════════════

async function part1() {
    console.log('\n── PART 1: Existing matters ──────────────────────────────');

    // 1. ELBETHEL V SHOKOYA — JUDGMENT (CLOSED)
    {
        const id = 'cmlgq01xg000114e7zxytra7a';
        await logHearing(id, d(2026,2,26),
            'Court did not sit. Matter adjourned for judgment.',
            'Court did not sit — matter stood over for judgment',
            d(2026,3,2), 'High Court of Lagos');
        await logHearing(id, d(2026,3,2),
            'Judgment delivered in favour of the Claimant. Claimant entitled to possession of property. Defendant ordered to vacate on or before 26 March 2026. Appearances: Maureen Omaegbu for Claimant; no appearance for Defendant; parties absent.',
            'Judgment — matter concluded',
            null, 'High Court of Lagos');
        await setNextDate(id, null, 'closed');
        console.log('✓ ELBETHEL V SHOKOYA — closed (judgment 2 Mar)');
    }

    // 2. Akanni Shelle v. Akanni Shelle
    {
        const id = 'cmlfct4oq000f3htwobxsrsgd';
        await logHearing(id, d(2026,2,25),
            'CC moved motion for extension of time to regularise claimant\'s reply and Defence to Counterclaim; granted without opposition. F. Abodunrin with Esther Alabi for Claimant; Kola Abdulsalam for 1st and 2nd Defendants; no appearance for 3rd Defendant (probate registrar). Claimant present in court.',
            'Enable DC to file reply to claimant\'s defence to counterclaim',
            d(2026,4,13), 'State High Court');
        await logHearing(id, d(2026,4,13),
            'DC moved motion to regularise reply to claimant\'s defence to counterclaim; granted without opposition. CC rose to request a date to bring an application to set aside the Reply, arguing it exceeded matters pleaded in his Defence to Counterclaim. DC responded that a Counterclaim is treated independently, and once filed the Claimant is entitled to file a Reply; awaiting the application. F. Abodunrin with Esther Alabi for Claimant; Kola Abdulsalam with Benjamin Adeyanju for 1st and 2nd Defendants; no appearance for 3rd Defendant.',
            'Further directives',
            d(2026,5,20), 'State High Court');
        await setNextDate(id, d(2026,5,20));
        console.log('✓ Akanni Shelle — 20 May 2026');
    }

    // 3. KANU V EMODI (HC)
    {
        const id = 'cmlgpkgrg0031uuvqiifotltt';
        await logHearing(id, d(2026,2,26),
            'Matter for mention. I.I. Umoh for Claimant; Nkem Eke for Defendant. Unable to conclude filing of Reply and other processes.',
            'Further directions',
            d(2026,4,1), 'High Court');
        await logHearing(id, d(2026,4,1),
            'Claimant present; Defendant absent. CC informed court of two pending applications dated 26 February 2026; no objection from DC; moved in terms; orders granted as prayed. Forms 17 & 18 filed by Claimant; DC has filed a reply. CMC date sought. I.I. Umoh, Prof F.N. Ndubuisi, M. Omaegbu for Claimant; Nkem Ekeh for Defendant.',
            'Case Management Conference (CMC)',
            d(2026,5,21), 'High Court');
        await setNextDate(id, d(2026,5,21));
        console.log('✓ KANU V EMODI — 21 May 2026 (CMC)');
    }

    // 4. The State of Lagos v. Keystone Bank and anor
    {
        const id = 'cmlgopovi001i11vjkfhc1xhp';
        await logHearing(id, d(2026,3,2),
            'Matter for report of settlement. Informed court that both parties are still meeting and pursuing the option of settlement. J. Ogbinaka and A.D. Gbadebo for 2nd Defendant; I.A. Erinkitola for Prosecution.',
            'Final report of settlement',
            d(2026,4,13), 'State High Court');
        await logHearing(id, d(2026,4,13),
            'Final report of settlement. Settlement achieved. Letter dated 2 April 2026 sent to Attorney-General of Lagos with receipt evidencing amount paid into State\'s account. Prosecution indicated they were unaware of settlement; acknowledged that once verified, matter would be withdrawn. J. Ogbinaka and A.D. Gbadebo for 2nd Defendant (Keystone Bank legal officer Mr Gbenga Okeniyi present); M.M. Kasali for Prosecution.',
            'Final report of settlement',
            d(2026,5,11), 'State High Court');
        await setNextDate(id, d(2026,5,11));
        console.log('✓ State v Keystone Bank — 11 May 2026');
    }

    // 5. IGP v. Felix Okocha & 2 Ors
    {
        const id = 'cmlgpc8op0003uuvqkbrzrp3f';
        await logHearing(id, d(2026,3,6),
            'Continuation of trial. Paul Ugoji for Prosecution; C.R. Eke for 1st Defendant; Benjamin Adeyanju holding watching brief for complainant. 1st Defendant present. Matter adjourned due to ongoing renovations at the Magistrate Court, Ebute Meta.',
            'Continuation of trial',
            d(2026,3,19), 'Chief Magistrate Court');
        // April 21 note records that 20 April (the scheduled date) court did not sit
        await logHearing(id, d(2026,4,20),
            'Court did not sit.',
            'Pending — no new date assigned',
            null, 'Chief Magistrate Court');
        await setNextDate(id, null);
        console.log('✓ IGP v Felix Okocha — proceedings logged; no current next date');
    }

    // 6. Akintan and ors v. OAUTH (Supplementary Paid Staff)
    {
        const id = 'cmlgovmli003011vjoebq887o';
        await logHearing(id, d(2026,3,3),
            'Matter slated for hearing. First witness Okoi David Ibiang began examination-in-chief; adopted Statement on Oath dated 21 June 2025 as evidence-in-chief. Tendered ~7 sets of documents; 5 identified. On 6th document (bundle of payslips for ~29 of 45 staff), court noted that in representative actions all 45 staff should produce payslips, just as they produced letters of appointment. Adjournment sought to do the needful. Kolawole Abdulsalam and Maureen Omaegbu for Claimants; T.S. Abdulkadir for Defendant.',
            'Continuation of examination-in-chief — produce payslips for all 45 staff',
            d(2026,4,21), 'National Industrial Court, Ibadan');
        // Court rescheduled 21 Apr → 18 May (NICN notice)
        await setNextDate(id, d(2026,5,18));
        console.log('✓ Akintan v OAUTH — 18 May 2026 (NICN Ibadan; note: court now sits at NICN Ibadan)');
    }

    // 7. Adegbite Gabriel Olushina & 5 Ors v. OAUTHC
    {
        const id = 'cmlgohsar000311vjt7dqmllx';
        await logHearing(id, d(2026,3,16),
            'Matter slated for hearing. Claimant called Adegbite Gabriel as CW1; adopted 38-paragraph Statement on Oath dated 28 July 2025. Documents admitted without objection: Exhibit C1 — letter of authorisation by 254 staff dated 30 May 2025; Exhibit C2 — spreadsheet of salaries; Exhibit C3 — invoice dated 4 April 2025; Exhibit C4 — letters of appointment of 254 staff. Additional documents provided by Defendant pursuant to notice to produce and subpoena but not in organised form; adjournment sought to arrange for next date. Kolawole Abdulsalam and Maureen Omaegbu for Claimant; T.S. Abdulkadri for Defendant.',
            'Continuation of hearing — arrange and tender remaining documents from Defendant',
            d(2026,5,11), 'National Industrial Court');
        await setNextDate(id, d(2026,5,11));
        console.log('✓ Adegbite Gabriel v OAUTHC — 11 May 2026');
    }

    // 8. Elizabeth Aminu v. Babatope Ogunniyi
    {
        const id = 'cmlgp3xjv001m15d7oj263sg6';
        await logHearing(id, d(2026,4,7),
            'Matter for report of settlement. Parties present. Adewumi Adisa for Claimant; Kolawole Abdulsalam and Maureen Omaegbu for Defendant. Defendant\'s counsel informed court that financial constraints prevent carrying out the offer previously made in open court; offer not to be construed as weakness. Claimant\'s counsel requested matter be set down for trial. Court advised both parties to remain open to settlement; noted litigation is lengthy and uncertain. Both parties agreed to return to mediation. Matter referred back to mediation.',
            'Report on mediation or trial',
            d(2026,6,9), 'State High Court');
        await setNextDate(id, d(2026,6,9));
        console.log('✓ Elizabeth Aminu v Ogunniyi — 9 Jun 2026');
    }

    // 9. State v Taiwo Kolawole & 3 Ors
    {
        const id = 'cmlgpob94004juuvq66lvl91x';
        await logHearing(id, d(2026,3,31),
            'Ogun State High Court, Ijebu Ode before Justice A.A. Omoniyi. A.M. Odubanjo for Prosecution; Kolawole Abdulsalam with Josephine Ogbinaka for 1st Defendant; Moruff Balogun with A.G. Sanni, I.O. Kasim, A.R. Olatokunbo, E.O. Adeyemi and A.A. Gbagbesin for 3rd Defendant; 2nd Defendant not represented. 1st–3rd Defendants produced from custody. Plea bargain for 1st Defendant ongoing; not yet concluded. Counsel advocating at a high level; expects completion soon.',
            'Final plea bargain update — irrespective of whether completed',
            d(2026,6,3), 'Ogun State High Court, Ijebu Ode');
        await setNextDate(id, d(2026,6,3));
        console.log('✓ State v Taiwo Kolawole — 3 Jun 2026 (final date)');
    }

    // 10. Renmoney v Ayodeji (Zenith 5th Garnishee) — discharged
    {
        const id = 'cmnq7wds00001fpzz20abyzgc';
        await logHearing(id, d(2026,4,8),
            'Garnishee proceedings at Magistrate Court of Lagos State, Ogba. Esther Odubajo for Judgement Creditor. JC counsel applied that Zenith Bank (5th Garnishee) be discharged from proceedings. Application granted. Zenith Bank discharged.',
            'Zenith Bank (5th Garnishee) discharged — no further role',
            null, 'Magistrate Court of Lagos State, Ogba');
        await setNextDate(id, null, 'closed');
        console.log('✓ Renmoney v Ayodeji — Zenith discharged / matter closed');
    }
}

// ═══════════════════════════════════════════════════════════════════════
// PART 2 — CREATE NEW MATTERS + LOG PROCEEDINGS
// ═══════════════════════════════════════════════════════════════════════

async function part2() {
    console.log('\n── PART 2: New matters ───────────────────────────────────');

    // 1. ELBETHEL V. ELIJAH OGUNLEYE (ORILE PPTY)
    {
        const id = await newMatter(
            'Elbethel v. Elijah Ogunleye (Orile Property)',
            'High Court of Lagos, Ikeja', 'Justice Abebiosun', d(2026,5,20));
        await logHearing(id, d(2026,2,19),
            'Defendant\'s counsel informed court that processes and application for extension of time have been filed but default fees not yet paid — awaiting Judge\'s sign-off on application for calculation of default fees (said application submitted only one day before the hearing). Adeola Adeoye and Maureen Omaegbu for Claimants; Mr Lawrence Eze for Defendant.',
            'Defendant to pay default fees and regularise processes',
            d(2026,3,4), 'High Court of Lagos, Ikeja');
        await logHearing(id, d(2026,3,4),
            'Defendant\'s counsel informed court of pending application for extension of time and moved same. Court granted the motion for extension of time. Adeola Adeoye and Benjamin Adeyanju for Claimants; Mr Lawrence Eze for Defendant.',
            'Further proceedings',
            d(2026,4,15), 'High Court of Lagos, Ikeja');
        await logHearing(id, d(2026,4,15),
            'Claimant\'s counsel informed court that reply has not yet been filed; will do so before the next adjourned date. Adeola Adeoye and Benjamin Adeyanju for Claimants; Mr Lawrence Eze for Defendant.',
            'Further proceedings',
            d(2026,5,20), 'High Court of Lagos, Ikeja');
        console.log('✓ Elbethel v Elijah Ogunleye — created | 3 proceedings | next: 20 May');
    }

    // 2. IKEJA ELECTRIC V. NERC & ORS
    {
        const id = await newMatter(
            'Ikeja Electric v. NERC & Ors',
            'Federal High Court, Ikoyi', 'Justice Kakaki', d(2026,5,14));
        await logHearing(id, d(2026,2,20),
            'Court informed parties it required further address on: (1) whether Plaintiff\'s claims challenge 2nd Defendant\'s statutory powers under the Electricity Act 2023 and MYTO 2024; and (2) whether facts disclose a reasonable cause of action or enforceable right against the 2nd Defendant sufficient to sustain the action. Parties to file written addresses simultaneously; 1st Defendant to be notified. Shakirudeen Mosobalaje for Claimant; Kolawole Abdulsalam with Adeola Adeoye for 1st Defendant; E.C.J. Ifeanacho for 5th Defendant.',
            'Adoption of written addresses',
            d(2026,3,25), 'Federal High Court, Ikoyi');
        await logHearing(id, d(2026,3,25),
            'Claimant adopted Additional Written Address dated 23 March 2026 on "issue of whether Plaintiff has cause of action against 2nd Defendant (NERC)". 1st Defendant adopted Further Written Address dated 24 March 2026. 2nd Defendant\'s counsel did not file additional written address but orally submitted that Plaintiff lacked cause of action against 2nd Defendant. Shakirudeen Mosobalaje for Claimant; Kolawole Abdulsalam with Adeola Adeoye for 1st Defendant; A.O. Obayomi for 2nd Defendant; E.C.J. Ifeanacho for 5th Defendant.',
            'Judgment',
            d(2026,5,14), 'Federal High Court, Ikoyi');
        console.log('✓ Ikeja Electric v NERC — created | 2 proceedings | next: 14 May (judgment)');
    }

    // 3. AKINYELE V. PENDRAGON & ORS
    {
        const id = await newMatter(
            'Akinyele v. Pendragon & Ors',
            'High Court of Lagos', 'Justice Odusanya', d(2026,5,7));
        await logHearing(id, d(2026,3,2),
            'Matter slated for trial. Claimants\' counsel applied to amend Statement of Claim and prayed court to deem the amended Further Statement of Claim as properly before the court, all parties having been served. Counsel for 1st & 2nd Defendants and 4th Defendant did not oppose. Court granted the application but ordered Claimants to refile amended processes within 7 days; Defendants to file reply within 7 days of service. Hearing notice ordered for 3rd Defendant. Rotimi Iroh with Lovina Mbaeze for Claimants; Tolulope Taiwo with Femi Elijah for 1st & 2nd Defendants; Mrs Iniobong Umoh with Adeola Adeoye for 4th Defendant; no appearance for 3rd Defendant.',
            'Mention',
            d(2026,3,31), 'High Court of Lagos');
        await logHearing(id, d(2026,3,31),
            'Claimants\' counsel confirmed amended statement of claim refiled and served on all parties. Counsel to 1st & 2nd Defendants confirmed service and retained right to amend statement of defence. Counsel to 3rd and 4th Defendants also retained right to amend. Lovina Mbaeze for Claimants; Miss Layeni with Esther Edeth for 1st & 2nd Defendants; Olatunji Olaniyi with O.C. Fasade for 3rd Defendant; Mrs Iniobong Umoh for 4th Defendant.',
            'Mention',
            d(2026,5,7), 'High Court of Lagos');
        console.log('✓ Akinyele v Pendragon — created | 2 proceedings | next: 7 May');
    }

    // 4. OWOLABI V. ORIOLOWO
    {
        const id = await newMatter(
            'Owolabi v. Oriolowo',
            'High Court of Lagos, Osbourne', 'Justice Oshin', d(2026,5,14));
        await logHearing(id, d(2026,2,26),
            'Justice Oshin did not sit. Registrar recorded appearances: Olushola Coker for Claimants; Adeola Adeoye and Benjamin Adeyanju for Defendants. 1st Defendant present.',
            'Hearing',
            d(2026,5,14), 'High Court of Lagos, Osbourne');
        console.log('✓ Owolabi v Oriolowo — created | next: 14 May');
    }

    // 5. ADISA MUYIWA MOHAMMED V. CUSTOMS & ANOR (TRANSFERRED)
    {
        const id = await newMatter(
            'Adisa Muyiwa Mohammed v. Nigeria Customs Service & Anor',
            'Federal High Court, Abuja → Transferred to Lagos', null, null, 'active');
        await logHearing(id, d(2026,3,6),
            'Ruling on 2nd Defendant\'s preliminary objection challenging territorial jurisdiction (PO heard 21 January 2026). Court held: contract in dispute, its performance and breach, and defendants\' addresses all in Lagos; Plaintiff\'s address throughout the contract was Ibadan; apart from Plaintiff\'s claim that most business is in Abuja, nothing else was done in Abuja. Court declined jurisdiction and ordered matter transferred to Lagos Chief Judge for onward transfer to Lagos.',
            'Transferred to Lagos — awaiting CJ reassignment',
            null, 'Federal High Court, Abuja');
        console.log('✓ Adisa Mohammed v Customs — created | transferred to Lagos');
    }

    // 6. REACHOUT HOUSING DEVELOPMENT LTD V. AWODUN
    {
        const id = await newMatter(
            'Reachout Housing Development Ltd v. Awodun',
            'FCT High Court, Jabi', null, d(2026,4,22));
        await logHearing(id, d(2026,3,6),
            'Hearing of Claimant\'s motion for extension of time. Motion heard and granted. Court informed that settlement is ongoing.',
            'Report of settlement or hearing',
            d(2026,4,22), 'FCT High Court, Jabi');
        console.log('✓ Reachout Housing v Awodun — created | next: 22 Apr');
    }

    // 7. ADEDIRE CAROLINE V. OAUTHC
    {
        const id = await newMatter(
            'Adedire Caroline v. OAUTHC',
            'National Industrial Court, Ibadan', null, d(2026,4,22));
        await logHearing(id, d(2026,3,9),
            'Matter for adoption of Final Written Addresses. Defendant\'s counsel absent (sent message of inability to attend, as on the last adjourned date; no letter of adjournment to court). Claimant\'s counsel (Prof Abiola Sanni SAN, Kolawole Abdulsalam, Maureen Omaegbu) noted they travelled from Lagos. Court proceeded pursuant to Order 45 Rule 7: Defendant\'s Final Written Address dated 14 October 2025 deemed adopted; Claimant\'s Final Written Address dated 3 December 2025 filed and adopted without further adumbration. No appearance for Defendant.',
            'Judgment',
            d(2026,4,22), 'National Industrial Court, Ibadan');
        console.log('✓ Adedire Caroline v OAUTHC — created | next: 22 Apr (judgment)');
    }

    // 8. JOHNSON ODION ESEZOOBO V. EDO STATE & ANOR (GARNISHEE — CONCLUDED)
    {
        const id = await newMatter(
            'Johnson Odion Esezoobo v. Government of Edo State & Anor (Garnishee)',
            'High Court', null, null, 'closed');
        await logHearing(id, d(2026,3,10),
            'Ruling on garnishee proceedings. Garnishee Order Nisi made 12 May 2025 for ₦33,000,000 (pre and post-judgment interest). 1st and 2nd Garnishees confirmed sufficient funds. Court held interest cannot accrue indefinitely in garnishee proceedings; total sum fixed at ₦72,212,000 following earlier computation. Garnishee Order Absolute made against 2nd Garnishee in the sum of ₦72,212,000; all other garnishees discharged. A.D. Gbadebo for 1st Garnishee; J.O. Esezoobo for Judgment Creditor.',
            'Garnishee Order Absolute — matter concluded',
            null, 'High Court');
        console.log('✓ Johnson Esezoobo v Edo State — created & closed | Garnishee Order Absolute ₦72,212,000');
    }

    // 9. ALHAJI IBRAHIM YAHAYA V. AIR MAROC (AWAITING DATE)
    {
        const id = await newMatter(
            'Re: Alhaji Ibrahim Yahaya v. Air Maroc',
            null, null, null);
        await logHearing(id, d(2026,3,23),
            'Court did not sit. New date to be communicated.',
            'Awaiting new date from court',
            null, null);
        console.log('✓ Alhaji Yahaya v Air Maroc — created | awaiting new date');
    }

    // 10. CHURCH OF GOD V. CAC & ANOR (TRANSFERRED TO EKITI)
    {
        const id = await newMatter(
            'Church of God v. CAC & Anor',
            'High Court of Lagos → Transferred to Ekiti', 'Justice Faji', null, 'closed');
        await logHearing(id, d(2026,3,24),
            'Plaintiff\'s witness present in court. Court re-examined jurisdiction: Plaintiff\'s head office — Ibadan; 1st Defendant (CAC) head office — Abuja; 2nd Defendant (using the name) — head office in Ekiti. Court held Lagos has no jurisdiction; since the 2nd Defendant (the entity actually using the name) is based in Ekiti, jurisdiction lies there. Matter transferred to Ekiti. Olubamiji Adeosun and Niyi Asiyanbola for Plaintiff; I.I. Umoh for 1st Defendant. No further date.',
            'Transferred to Ekiti State High Court — no further date',
            null, 'High Court of Lagos (Justice Faji)');
        console.log('✓ Church of God v CAC — created & closed | transferred to Ekiti');
    }

    // 11. TAIBAT LAWANSON V. AKINWALE LAWANSON (ZENITH BANK — 7TH GARNISHEE)
    {
        const id = await newMatter(
            'Taibat Lawanson v. Akinwale Lawanson (Zenith Bank — 7th Garnishee)',
            'Matrimonial / Family Court', null, null, 'closed');
        await logHearing(id, d(2026,4,1),
            'Judgment Debtor filed motion to set aside exparte Garnishee order made 12 February 2026. Judgment Creditor filed counter-affidavit and written address dated 12 March 2026 in opposition. Court noted matter substantially relates to matrimonial causes and child support issues; should be resolved by other means beyond garnishee proceedings. Garnishees with no accounts belonging to Judgment Debtor discharged. Zenith Bank (7th Garnishee) discharged from proceedings. A.D. Gbadebo for 7th Garnishee; Oluwabunmi Adeleye for Judgment Creditor.',
            'Zenith Bank (7th Garnishee) discharged — no further role',
            null, 'Family Court');
        console.log('✓ Taibat Lawanson v Akinwale Lawanson — created | Zenith discharged');
    }

    // 12. CHI V. FIRS
    {
        const id = await newMatter(
            'Chi v. FIRS',
            'Federal High Court, Ikoyi', 'Justice Kakaki', null);
        await logHearing(id, d(2026,4,21),
            'Matter scheduled for further direction. On attending court, matter not on cause list. Registrar confirmed case file forwarded to DRC for reassignment. Letter indicating matter should remain before Justice Kakaki not yet transmitted by Chief Registrar to the court. Matter cannot be taken until court formally receives communication and assigns mention date. Unable to see Justice Kakaki — court was engaged with multiple trial matters. No appearances.',
            'Pending DRC reassignment — follow up with Chief Registrar urgently',
            null, 'Federal High Court, Ikoyi');
        console.log('✓ Chi v FIRS — created | pending DRC reassignment');
    }

    // 13. ESTATE OF WILLIAMS V. JIDE TAIWO
    {
        const id = await newMatter(
            'Estate of Williams v. Jide Taiwo',
            'High Court of Lagos, Osbourne', 'Justice George', d(2026,5,18));
        await logHearing(id, d(2026,4,21),
            'Court (Justice George, High Court of Lagos, Osbourne) did not sit.',
            'Further proceedings',
            d(2026,5,18), 'High Court of Lagos, Osbourne');
        console.log('✓ Estate of Williams v Jide Taiwo — created | next: 18 May');
    }

    // 14. ZIK V. UGWU
    {
        await newMatter('Zik v. Ugwu', null, null, d(2026,5,13));
        console.log('✓ Zik v Ugwu — created | ruling: 13 May 2026');
    }

    // 15. PROF ADARALEGBE V. FOURTH ESTATE, LEKAN ALLI & 2 ORS
    {
        const id = await newMatter(
            'Prof Adaralegbe v. Fourth Estate, Lekan Alli & 2 Ors',
            'High Court of Lagos', 'Justice Alakija', null);
        await logHearing(id, d(2026,4,15),
            'Mr Lekan Alli and Shola Adetunji present. Court (Justice Alakija) did not sit. Notification received shortly before 12:00. New date to be received the following week.',
            'Awaiting new date from court',
            null, 'High Court of Lagos (Justice Alakija)');
        console.log('✓ Prof Adaralegbe v Fourth Estate — created | awaiting new date');
    }

    // 16. CODAS V. EVERGREEN (PROF GBIRI MATTER)
    {
        await newMatter(
            'Codas v. Evergreen (Prof Gbiri matter)',
            'JIC Old Magistrate Court, Igbosere', null, d(2026,5,7));
        console.log('✓ Codas v Evergreen — created | next: 7 May 2026');
    }
}

async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  REFORMA — Proceedings Backlog Insert (Feb–May 2026)');
    console.log('═══════════════════════════════════════════════════');
    await part1();
    await part2();
    console.log('\n═══════════════════════════════════════════════════');
    console.log(`  Done.`);
    console.log(`  Calendar entries created : ${entriesCreated}`);
    console.log(`  New matters created      : ${mattersCreated}`);
    console.log(`  Existing matters updated : ${mattersUpdated}`);
    console.log('═══════════════════════════════════════════════════\n');
    await prisma.$disconnect();
}

main().catch(e => {
    console.error('\n❌ Error:', e.message);
    prisma.$disconnect();
    process.exit(1);
});
