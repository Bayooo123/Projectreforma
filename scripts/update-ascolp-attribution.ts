import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEAM_MEMBERS = [
  { short: 'Prof', full: 'Abiola Sanni SAN' },
  { short: 'Kola', full: 'Kola Abdulsalam' },
  { short: 'Josephine', full: 'Josephine Ogbinaka' },
  { short: 'Adeola', full: 'Adeola Adeoye' },
  { short: 'Omowumi', full: 'Omowumi Adeoye' },
  { short: 'Bayo', full: 'Adebayo Gbadebo' },
  { short: 'Ben', full: 'Benjamin Adeyanju' },
  { short: 'Iniobong', full: 'Iniobong Inieke Umoh' },
  { short: 'Maureen', full: 'Maureen Omaegbu' },
  { short: 'Mrs. Ini', full: 'Iniobong Inieke Umoh' },
  { short: 'Mr. Kola', full: 'Kola Abdulsalam' },
];

const MATTERS_TO_UPDATE = [
  { search: 'Keystone Bank', handler: 'Josephine', s1: 'Bayo' },
  { search: 'Chi V. FIRS', handler: 'Mrs. Ini', s1: 'Bayo' },
  { search: 'Johnson Odion Esezoobo', handler: 'Josephine', s1: 'Josephine' },
  { search: 'Adisa Muyiwa Mohammed', handler: 'Omowumi', s1: 'Ben' },
  { search: 'Reachout Housing Development', handler: 'Omowumi', s1: 'Josephine', s2: 'Bayo' },
  { search: 'Alhaji Ibrahim Yahaya V. Air Maroc', handler: 'Mr. Kola', s1: 'Maureen' },
  { search: 'Ikeja Electric V. NERC', handler: 'Mr. Kola', s1: 'Adeola' },
  { search: 'Estate of Williams V. Jide Taiwo', handler: 'Adeola', s1: 'Adeola' },
  { search: 'Zik V. Ugwu', handler: 'Iniobong', s1: 'Bayo' },
  { search: 'Elbethel V. Elijah Ogunleye', handler: 'Kola', s1: 'Maureen' },
  { search: 'Akinyele V. Pendragon', handler: 'Bayo', s1: 'Bayo' },
  { search: 'Codas V. Evergreen', handler: 'Bayo', s1: 'Bayo' },
  { search: 'Prof Adaralegbe V. Fourth Estate', handler: 'Bayo / Ben', s1: 'Ben' },
  { search: 'Taibat Lawanson V. Akinwale Lawanson', handler: 'Bayo', s1: 'Bayo' },
  { search: 'Church of God V. CAC', handler: 'Bayo', s1: 'Bayo' },
  { search: 'Adedire Caroline V. OAUTHC', handler: 'Bayo', s1: 'Bayo' },
  { search: 'Owolabi V. Oriolowo', handler: 'Mr. Kola', s1: 'Adeola', s2: 'Ben' },
  { search: 'Mike Igbokwe SAN', handler: 'Josephine', s1: 'Bayo' },
  { search: 'Catalyst Business Consult', handler: 'Mr Kola', s1: 'Bayo' },
  { search: 'Ego Chinwuba', handler: 'Josephine', s1: 'Bayo' },
  { search: 'Halimat Akanni-Shelle', handler: 'Kola', s1: 'Ben' },
  { search: 'Aou Ventures', handler: 'Adeola', s1: 'Ben' },
  { search: 'Hoteliers Assoc of Oyo State', handler: 'Mr Kola', s1: 'Ben' },
  { search: 'Hotelliers Association of Oyo State', handler: 'Mr Kola', s1: 'Ben' },
  { search: 'Elbethel V. Shokoya', handler: 'Maureen', s1: 'Bayo' },
  { search: 'Taiwo Kolawole', handler: 'Kola', s1: 'Josephine', s2: 'Bayo' },
  { search: 'Kanu V. Emodi', handler: 'Mrs. Iniobong', s1: 'Maureen' },
  { search: 'Trustees of El-Bethel', handler: 'Josephine', s1: 'Josephine' },
  { search: 'Felix Okocha', handler: 'Ben', s1: 'Ben' },
  { search: 'Honnex Energy', handler: 'Josephine', s1: 'Josephine' },
  { search: 'Zenith Bank Nigeria PLC', handler: 'Josephine', s1: 'Josephine' }, // Honnex mapping
  { search: 'Elizabeth Aminu', handler: 'Iniobong', s1: 'Iniobong' },
  { search: 'Babatope Ogunniyi', handler: 'Iniobong', s1: 'Iniobong' }, // Elizabeth Aminu mapping
  { search: 'Awosope', handler: 'Bayo', s1: 'Bayo' },
  { search: 'Akintan', handler: 'Kola', s1: 'Kola' },
  { search: 'Theophilus Ogunleye', handler: 'Ben', s1: 'Ben' },
  { search: 'Balogun V. Balogun', handler: 'Josephine', s1: 'Josephine' },
  { search: 'Akanni Shelle', handler: 'Mr. Kola', s1: 'Kola' },
  { search: 'Adegbite Gabriel Olushina', handler: 'Mr Kola', s1: 'Bayo' },
];

async function main() {
  const workspace = await prisma.workspace.findFirst({
    where: { OR: [{ slug: 'ascolp' }, { name: { contains: 'ASCOLP', mode: 'insensitive' } }] }
  });

  if (!workspace) {
    console.error('ASCOLP workspace not found');
    return;
  }

  const users = await prisma.user.findMany({
    where: { workspaces: { some: { workspaceId: workspace.id } } }
  });

  const nameToId = (name: string) => {
    const member = TEAM_MEMBERS.find(m => m.short === name || m.full === name);
    if (!member) return null;
    const user = users.find(u => u.name?.includes(member.full) || u.name?.includes(member.short));
    return user?.id || null;
  };

  console.log(`Updating attribution for matters in workspace ${workspace.name} (${workspace.id})...`);

  for (const m of MATTERS_TO_UPDATE) {
    // Find existing brief by name
    const brief = await prisma.brief.findFirst({
      where: {
        workspaceId: workspace.id,
        deletedAt: null,
        name: { contains: m.search, mode: 'insensitive' }
      }
    });

    if (!brief) {
      console.warn(`Brief not found for: ${m.search}`);
      continue;
    }

    const handlers = m.handler.split('/').map(h => h.trim());
    const handlerId = nameToId(handlers[0]);
    
    const assignments = [
      ...handlers.map(h => ({ lawyerId: nameToId(h), role: 'Primary Handler' })),
      { lawyerId: nameToId(m.s1), role: 'Secondary 1' },
      { lawyerId: nameToId(m.s2 || ''), role: 'Secondary 2' },
    ].filter(a => a.lawyerId !== null) as { lawyerId: string; role: string }[];

    // Remove duplicate lawyer assignments
    const uniqueAssignments = assignments.filter((a, i) => 
      assignments.findIndex(x => x.lawyerId === a.lawyerId) === i
    );

    try {
      await prisma.$transaction([
        // Clear existing assignments
        prisma.briefLawyer.deleteMany({ where: { briefId: brief.id } }),
        // Update handler info
        prisma.brief.update({
          where: { id: brief.id },
          data: {
            lawyerInChargeId: handlerId || brief.lawyerInChargeId,
            briefLawyers: {
              create: uniqueAssignments
            }
          }
        })
      ]);
      console.log(`Updated Attribution: ${brief.briefNumber} - ${brief.name}`);
    } catch (e: any) {
      console.error(`Failed to update brief ${brief.briefNumber}: ${e.message}`);
    }
  }

  console.log('Attribution update completed!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
