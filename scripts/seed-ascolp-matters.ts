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

const MATTERS = [
  { name: 'Keystone Bank V. The State of Lagos', type: 'Litigation', handler: 'Josephine', s1: 'Bayo' },
  { name: 'Chi V. FIRS', type: 'Litigation', handler: 'Mrs. Ini', s1: 'Bayo' },
  { name: 'Johnson Odion Esezoobo V. Govt of Edo State & Anor (Garnishee)', type: 'Litigation', handler: 'Josephine', s1: 'Josephine' },
  { name: 'Adisa Muyiwa Mohammed V. Nigeria Customs Service & Anor', type: 'Litigation', handler: 'Omowumi', s1: 'Ben' },
  { name: 'Reachout Housing Development Ltd V. Awodun (Prof Awodun Matter)', type: 'Litigation', handler: 'Omowumi', s1: 'Josephine', s2: 'Bayo' },
  { name: 'Re: Alhaji Ibrahim Yahaya V. Air Maroc', type: 'Litigation', handler: 'Mr. Kola', s1: 'Maureen' },
  { name: 'Ikeja Electric V. NERC & Ors', type: 'Litigation', handler: 'Mr. Kola', s1: 'Adeola' },
  { name: 'Estate of Williams V. Jide Taiwo', type: 'Litigation', handler: 'Adeola', s1: 'Adeola' },
  { name: 'Zik V. Ugwu', type: 'Litigation', handler: 'Iniobong', s1: 'Bayo' },
  { name: 'Elbethel V. Elijah Ogunleye (Orile Property)', type: 'Litigation', handler: 'Kola', s1: 'Maureen' },
  { name: 'Akinyele V. Pendragon & Ors', type: 'Litigation', handler: 'Bayo', s1: 'Bayo' },
  { name: 'Codas V. Evergreen (Prof Gbiri Matter)', type: 'Litigation', handler: 'Bayo', s1: 'Bayo' },
  { name: 'Prof Adaralegbe V. Fourth Estate, Lekan Alli & 2 Ors', type: 'Litigation', handler: 'Bayo / Ben', s1: 'Ben' },
  { name: 'Taibat Lawanson V. Akinwale Lawanson (Zenith Bank — 7th Garnishee)', type: 'Litigation', handler: 'Bayo', s1: 'Bayo' },
  { name: 'Church of God V. CAC & Anor', type: 'Litigation', handler: 'Bayo', s1: 'Bayo' },
  { name: 'Adedire Caroline V. OAUTHC', type: 'Litigation', handler: 'Bayo', s1: 'Bayo' },
  { name: 'Owolabi V. Oriolowo', type: 'Litigation', handler: 'Mr. Kola', s1: 'Adeola', s2: 'Ben' },
  { name: 'Mr Mike Igbokwe SAN — Tax advisory', type: 'Tax Advisory', handler: 'Josephine', s1: 'Bayo' },
  { name: 'Catalyst Business Consult', type: 'Real Estate', handler: 'Mr Kola', s1: 'Bayo' },
  { name: 'Ego Chinwuba and Co (Garnishee Matters)', type: 'Litigation', handler: 'Josephine', s1: 'Bayo' },
  { name: 'Miss Halimat Akanni-Shelle V. Administrators of the Akanni-Shelle Estate', type: 'Litigation', handler: 'Kola', s1: 'Ben' },
  { name: 'Aou Ventures Ltd V. Peace Marine and Energy Ltd', type: 'Litigation', handler: 'Adeola', s1: 'Ben' },
  { name: 'Hoteliers Assoc of Oyo State V. AG of Oyo & FIRS', type: 'Litigation', handler: 'Mr Kola', s1: 'Ben' },
  { name: 'Elbethel V. Shokoya', type: 'Litigation', handler: 'Maureen', s1: 'Bayo' },
  { name: 'State V. Taiwo Kolawole & 3 Ors (Plea Bargain)', type: 'Criminal', handler: 'Kola', s1: 'Josephine', s2: 'Bayo' },
  { name: 'Kanu V. Emodi (HC)', type: 'Litigation', handler: 'Mrs. Iniobong', s1: 'Maureen' },
  { name: 'Most Senior Rev Mother Modupe Bakare V. El-Bethel Church of Christ (Trustees)', type: 'Litigation', handler: 'Josephine', s1: 'Josephine' },
  { name: 'IGP V. Felix Okocha & 2 Ors', type: 'Criminal', handler: 'Ben', s1: 'Ben' },
  { name: 'Honnex Energy V. Damid Energy (Zenith Bank Nigeria PLC)', type: 'Litigation', handler: 'Josephine', s1: 'Josephine' },
  { name: 'Elizabeth Aminu V. Babatope Ogunniyi', type: 'Litigation', handler: 'Iniobong', s1: 'Iniobong' },
  { name: 'Awosope and Ors V. OAUTCH', type: 'Litigation', handler: 'Bayo', s1: 'Bayo' },
  { name: 'Akintan and Ors V. OAUTCH', type: 'Litigation', handler: 'Kola', s1: 'Kola' },
  { name: 'Theophilus Ogunleye V. Samuel Alaba', type: 'Litigation', handler: 'Ben', s1: 'Ben' },
  { name: 'Balogun V. Balogun', type: 'Litigation', handler: 'Josephine', s1: 'Josephine' },
  { name: 'Akanni Shelle V. Akanni Shelle', type: 'Litigation', handler: 'Mr. Kola', s1: 'Kola' },
  { name: 'Adegbite Gabriel Olushina & 5 Ors V. OAUTCH', type: 'Litigation', handler: 'Mr Kola', s1: 'Bayo' },
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

  console.log(`Feeding ${MATTERS.length} matters into workspace ${workspace.name} (${workspace.id})...`);

  for (const [index, m] of MATTERS.entries()) {
    const briefNumber = `ASCOLP-${String(index + 1).padStart(3, '0')}`;
    
    // Parse handler for "Bayo / Ben" cases
    const handlers = m.handler.split('/').map(h => h.trim());
    const handlerId = nameToId(handlers[0]);
    
    const assignments = [
      ...handlers.map(h => ({ lawyerId: nameToId(h), role: 'Primary Handler' })),
      { lawyerId: nameToId(m.s1), role: 'Secondary 1' },
      { lawyerId: nameToId(m.s2 || ''), role: 'Secondary 2' },
    ].filter(a => a.lawyerId !== null) as { lawyerId: string; role: string }[];

    // Remove duplicate lawyer assignments (pick first role)
    const uniqueAssignments = assignments.filter((a, i) => 
      assignments.findIndex(x => x.lawyerId === a.lawyerId) === i
    );

    try {
      const brief = await prisma.brief.create({
        data: {
          briefNumber,
          name: m.name,
          category: m.type,
          status: 'active',
          workspaceId: workspace.id,
          lawyerId: handlerId || users[0].id,
          lawyerInChargeId: handlerId,
          briefLawyers: {
            create: uniqueAssignments
          }
        }
      });
      console.log(`Created Brief: ${brief.briefNumber} - ${brief.name}`);
    } catch (e: any) {
      console.error(`Failed to create brief ${briefNumber}: ${e.message}`);
    }
  }

  console.log('Seeding completed!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
