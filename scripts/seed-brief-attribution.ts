/**
 * Brief attribution seeder for ASCOLP workspace.
 *
 * Usage:
 *   npx tsx scripts/seed-brief-attribution.ts          # dry run (no DB writes)
 *   npx tsx scripts/seed-brief-attribution.ts --apply  # apply to database
 *
 * What it does:
 *   1. Finds the ASCOLP workspace (by email domain @abiolasanniandco.com)
 *   2. Looks up each of the 9 lawyers by email
 *   3. Matches each of the 36 briefs by name keywords
 *   4. Sets lawyerInChargeId (Primary Handler) on each brief
 *   5. Creates BriefLawyer rows for Secondary 1 / Secondary 2
 *   6. Also creates MatterLawyer rows on the linked matter (if any)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes('--apply');

// ── Email map ────────────────────────────────────────────────────────────────

const DOMAIN = 'abiolasanniandco.com';

const USERS: Record<string, string> = {
    asanni:   `asanni@${DOMAIN}`,
    iniobong: `iniobong@${DOMAIN}`,
    kola:     `kola@${DOMAIN}`,
    riwo:     `riwo@${DOMAIN}`,      // Josephine
    maureen:  `maureen@${DOMAIN}`,
    ade:      `ade@${DOMAIN}`,       // Adeola
    ben:      `ben@${DOMAIN}`,       // Benjamin
    bayo:     `bayo@${DOMAIN}`,
    omowumi:  `omowumi@${DOMAIN}`,
};

// ── Attribution table ────────────────────────────────────────────────────────
// keys: array of distinctive words that MUST ALL appear in the brief name (case-insensitive)
// primary: email key
// s1, s2: secondary 1 & 2 email keys (optional)

const ATTRIBUTIONS: Array<{
    keys: string[];
    primary: string;
    s1?: string;
    s2?: string;
}> = [
    { keys: ['Keystone Bank', 'Lagos'],                              primary: 'kola',     s1: 'riwo',     s2: 'bayo'    },
    { keys: ['Chi', 'FIRS'],                                          primary: 'asanni',   s1: 'iniobong', s2: 'riwo'    },
    { keys: ['Esezoobo', 'Edo'],                                      primary: 'iniobong', s1: 'riwo',     s2: 'bayo'    },
    { keys: ['Adisa', 'Customs'],                                     primary: 'asanni',   s1: 'omowumi',  s2: 'ben'     },
    { keys: ['Reachout', 'Awodun'],                                   primary: 'omowumi',  s1: 'riwo',     s2: 'bayo'    },
    { keys: ['Ibrahim Yahaya', 'Air Maroc'],                          primary: 'kola',     s1: 'maureen',  s2: 'ade'     },
    { keys: ['Ikeja Electric', 'NERC'],                               primary: 'kola',     s1: 'ade',      s2: 'bayo'    },
    { keys: ['Estate of Williams', 'Jide Taiwo'],                     primary: 'iniobong', s1: 'ade',      s2: 'ben'     },
    { keys: ['Zik', 'Ugwu'],                                          primary: 'asanni',   s1: 'iniobong', s2: 'bayo'    },
    { keys: ['Elbethel', 'Elijah Ogunleye'],                          primary: 'kola',     s1: 'maureen',  s2: 'ben'     },
    { keys: ['Akinyele', 'Pendragon'],                                primary: 'iniobong', s1: 'ade',      s2: 'bayo'    },
    { keys: ['Codas', 'Evergreen'],                                   primary: 'kola',     s1: 'iniobong', s2: 'ben'     },
    { keys: ['Adaralegbe', 'Fourth Estate'],                          primary: 'asanni',   s1: 'riwo',     s2: 'bayo'    },
    { keys: ['Taibat Lawanson', 'Akinwale'],                          primary: 'iniobong', s1: 'riwo',     s2: 'bayo'    },
    { keys: ['Church of God', 'CAC'],                                 primary: 'kola',     s1: 'bayo'                    },
    { keys: ['Adedire Caroline', 'OAUTHC'],                           primary: 'kola',     s1: 'maureen',  s2: 'ben'     },
    { keys: ['Owolabi', 'Oriolowo'],                                  primary: 'kola',     s1: 'ade',      s2: 'ben'     },
    { keys: ['Igbokwe', 'Tax'],                                       primary: 'asanni',   s1: 'riwo',     s2: 'bayo'    },
    { keys: ['Catalyst Business'],                                    primary: 'kola',     s1: 'bayo'                    },
    { keys: ['Ego Chinwuba', 'Garnishee'],                            primary: 'iniobong', s1: 'riwo',     s2: 'bayo'    },
    { keys: ['Halimat', 'Akanni'],                                    primary: 'kola',     s1: 'ben'                     },
    { keys: ['Aou Ventures', 'Peace Marine'],                         primary: 'ade',      s1: 'ben'                     },  // may not be in DB yet
    { keys: ['Association of Oyo', 'Oyo State'],                      primary: 'kola',     s1: 'ben'                     },  // "Hotelliers Association of Oyo State"
    { keys: ['Elbethel', 'Shokoya'],                                  primary: 'maureen',  s1: 'bayo'                    },  // may be stored as generic name
    { keys: ['Taiwo Kolawole'],                                        primary: 'kola',     s1: 'riwo',     s2: 'bayo'    },  // "Mr Taiwo Kolawole v Opposing Party"
    { keys: ['Mr. Kanu'],                                             primary: 'iniobong', s1: 'maureen'                 },  // "Mr. Kanu v Opposing Party"
    { keys: ['El-Bethel', 'Trustees'],                                primary: 'kola',     s1: 'riwo',     s2: 'ben'     },  // "Incorporated Trustees of El-Bethel"
    { keys: ['Felix Okocha'],                                         primary: 'ade',      s1: 'ben',      s2: 'bayo'    },  // "Felix Okocha v Opposing Party"
    { keys: ['Zenith Bank Nigeria PLC', 'State High Court'],          primary: 'riwo'                                   },  // "Zenith Bank Nigeria PLC v Opposing Party" = Honnex/Damid
    { keys: ['Babatope', 'Ogunniyi'],                                  primary: 'iniobong', s1: 'maureen',  s2: 'bayo'    },  // "Dr Babatope Ogunniyi v Opposing Party"
    { keys: ['Awosope', 'National Industrial'],                       primary: 'kola',     s1: 'maureen',  s2: 'ben'     },  // "Awosope and ors v Opposing Party - National Industrial"
    { keys: ['Akintan', 'National Industrial'],                       primary: 'kola'                                   },  // "Mr Akintan and ors v Opposing Party - National Industrial"
    { keys: ['Theophilus Ogunleye'],                                  primary: 'ben'                                    },  // "Theophilus Ogunleye v Opposing Party"
    { keys: ['Balogun', 'Balogun'],                                   primary: 'kola',     s1: 'riwo',     s2: 'bayo'    },
    { keys: ['Akanni Shelle', 'Akanni Shelle'],                       primary: 'kola',     s1: 'ade',      s2: 'ben'     },
    { keys: ['Adegbite', 'National Industrial'],                      primary: 'kola',     s1: 'maureen',  s2: 'ben'     },  // "Adegbite Gabriel Olushina v Opposing Party - National Industrial"
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function norm(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchesBrief(briefName: string, keys: string[]): boolean {
    const n = norm(briefName);
    return keys.every(k => n.includes(norm(k)));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n🔍  Brief Attribution Seeder — ${DRY_RUN ? 'DRY RUN' : 'APPLY MODE'}\n`);

    // 1. Find the ASCOLP workspace by email domain
    const workspace = await prisma.workspace.findFirst({
        where: {
            members: { some: { user: { email: { endsWith: `@${DOMAIN}` } } } },
        },
        select: { id: true, name: true, slug: true },
    });

    if (!workspace) {
        console.error(`❌  No workspace found with members @${DOMAIN}`);
        process.exit(1);
    }
    console.log(`✅  Workspace: "${workspace.name}" (${workspace.slug}) — id: ${workspace.id}\n`);

    // 2. Look up users by email
    const userMap: Record<string, { id: string; name: string | null; email: string }> = {};
    for (const [key, email] of Object.entries(USERS)) {
        const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
        if (user) {
            userMap[key] = user;
            console.log(`  ✓ ${key.padEnd(10)} → ${user.name || user.email}`);
        } else {
            console.warn(`  ⚠ ${key.padEnd(10)} → NOT FOUND (${email})`);
        }
    }
    console.log('');

    // 3. Fetch all active briefs in workspace
    const briefs = await prisma.brief.findMany({
        where: { workspaceId: workspace.id, status: 'active', deletedAt: null },
        select: { id: true, name: true, customTitle: true, lawyerInChargeId: true, matterId: true },
    });
    console.log(`📂  ${briefs.length} active briefs found in workspace\n`);

    // 4. Match and apply attribution
    let matched = 0;
    let unmatched: string[] = [];

    for (const attr of ATTRIBUTIONS) {
        const brief = briefs.find(b => matchesBrief(b.customTitle || b.name, attr.keys));

        if (!brief) {
            unmatched.push(attr.keys.join(' + '));
            console.warn(`  ⚠ NO MATCH: [${attr.keys.join(', ')}]`);
            continue;
        }

        const primary = userMap[attr.primary];
        const sec1    = attr.s1 ? userMap[attr.s1] : null;
        const sec2    = attr.s2 ? userMap[attr.s2] : null;

        if (!primary) {
            console.warn(`  ⚠ Primary user "${attr.primary}" not found — skipping: ${brief.name}`);
            continue;
        }

        const secondaries = [sec1, sec2].filter(Boolean) as typeof sec1[];

        console.log(`  ✓ MATCH: "${brief.name}"`);
        console.log(`      Primary:    ${primary.name || primary.email}`);
        if (sec1) console.log(`      Secondary1: ${sec1.name || sec1.email}`);
        if (sec2) console.log(`      Secondary2: ${sec2.name || sec2.email}`);

        matched++;

        if (!DRY_RUN) {
            // Set primary handler on brief
            await prisma.brief.update({
                where: { id: brief.id },
                data: { lawyerInChargeId: primary.id },
            });

            // Create BriefLawyer rows for secondaries (upsert — idempotent)
            for (const sec of secondaries) {
                if (!sec) continue;
                await prisma.briefLawyer.upsert({
                    where: { briefId_lawyerId: { briefId: brief.id, lawyerId: sec.id } },
                    create: { briefId: brief.id, lawyerId: sec.id, role: 'assisting' },
                    update: {},
                });
            }

            // Also set lawyerInChargeId + MatterLawyer on linked matter (for calendar visibility)
            if (brief.matterId) {
                await prisma.matter.update({
                    where: { id: brief.matterId },
                    data: { lawyerInChargeId: primary.id },
                });

                for (const sec of secondaries) {
                    if (!sec) continue;
                    await prisma.matterLawyer.upsert({
                        where: { matterId_lawyerId: { matterId: brief.matterId, lawyerId: sec.id } },
                        create: { matterId: brief.matterId, lawyerId: sec.id, role: 'assisting' },
                        update: {},
                    });
                }
            }
        }
    }

    console.log(`\n── Summary ──────────────────────────────────────────────`);
    console.log(`   Matched:   ${matched}/${ATTRIBUTIONS.length}`);
    console.log(`   Unmatched: ${unmatched.length}`);
    if (unmatched.length > 0) {
        console.log(`\n   Unmatched keys (check brief names in DB):`);
        unmatched.forEach(u => console.log(`     • ${u}`));
    }
    if (DRY_RUN) {
        console.log(`\n   ℹ  This was a DRY RUN. Run with --apply to write to DB.`);
    } else {
        console.log(`\n   ✅  Attribution applied to database.`);
    }
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
