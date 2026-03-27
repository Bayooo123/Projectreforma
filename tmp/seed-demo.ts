import 'dotenv/config';
import { PrismaClient, CalendarEventType, ExpenseCategory } from '@prisma/client';

const prisma = new PrismaClient();

const WORKSPACE_ID = 'cmlteuiz40003ym902kk2jhfv'; // Gbadebo, Usman and Okoro
const USER_EMAIL = 'dhaveedace@gmail.com';

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const productAdjectives = ['Confidential', 'Urgent', 'Strategic', 'High-Risk', 'International', 'Complex'];
const companies = ['Zylog Group', 'NexTech Solutions', 'Global Logistics Co.', 'Mega Corp', 'Vortex Industries'];
const lawyerLastNames = ['Adeyemis', 'Okoro', 'Williams', 'Bello', 'Sanni', 'Gbadebo'];
const eventTitles = [
  'Mentioning for Directions',
  'Hearing of Interlocutory Application',
  'Cross-Examination of PW1',
  'Adoption of Written Addresses',
  'Judgment Delivery',
  'Meeting with Senior Counsel'
];
const expenseDesc = [
  'Filing fees for new motion',
  'Transport and Logistics to Court',
  'Stationery and Printing',
  'Refreshments for client meeting',
  'Internet Subscription'
];

async function main() {
  console.log('Starting demo data seeding...');

  // 0. Verify Workspace
  const workspace = await prisma.workspace.findUnique({
    where: { id: WORKSPACE_ID }
  });

  if (!workspace) {
    console.error(`❌ Workspace with ID ${WORKSPACE_ID} not found. Please verify the ID.`);
    process.exit(1);
  }
  console.log(`✅ Verified Workspace: ${workspace.name}`);

  // 0b. Verify User
  const user = await prisma.user.findUnique({
    where: { email: USER_EMAIL }
  });

  if (!user) {
    console.error(`❌ User with email ${USER_EMAIL} not found. Please verify the email.`);
    process.exit(1);
  }
  const USER_ID = user.id;
  console.log(`✅ Verified User: ${user.name || user.email} (ID: ${USER_ID})`);

  // 1. Create a Demo Client
  const demoEmail = `demo-investor-${Date.now()}@example.com`;
  const client = await prisma.client.create({
    data: {
      name: 'Global Ventures Ltd',
      email: demoEmail,
      company: 'Global Ventures',
      industry: 'Technology',
      workspaceId: WORKSPACE_ID,
    }
  });
  console.log(`✅ Created Demo Client: ${client.name} (${client.email})`);

  // 2. Create 10 Matters
  const matters = [];
  for (let i = 1; i <= 10; i++) {
    const matterName = `High-Stakes ${getRandomElement(productAdjectives)} Litigation vs ${getRandomElement(companies)}`;
    const matter = await prisma.matter.create({
      data: {
        name: matterName,
        caseNumber: `FHC/L/CS/${2024 + i}/${getRandomInt(100, 999)}`,
        clientId: client.id,
        workspaceId: WORKSPACE_ID,
        lawyerInChargeId: USER_ID,
        court: 'Federal High Court, Lagos',
        judge: `Hon. Justice ${getRandomElement(lawyerLastNames)}`,
        status: 'active',
      }
    });
    matters.push(matter);
  }
  console.log(`✅ Created 10 Matters`);

  // 3. Create 10 Briefs
  for (let i = 0; i < 10; i++) {
    const briefId = `demo-brief-${i}-${Date.now()}`;
    const briefNumber = `B-${2024}-${100 + i}-${Date.now().toString().slice(-4)}`;
    const inboundEmailId = `brief-${Math.random().toString(36).substring(7)}`;
    
    // We use raw SQL because the "briefId" column exists but is NOT in the schema.
    // We use public."Brief" to be explicit about schema and casing.
    await prisma.$executeRawUnsafe(`
      INSERT INTO public."Brief" ("id", "briefNumber", "name", "clientId", "matterId", "lawyerId", "workspaceId", "category", "status", "inboundEmailId", "briefId", "updatedAt")
      VALUES ('${briefId}', '${briefNumber}', 'Legal Opinion on ${getRandomElement(productAdjectives)} Compliance', '${client.id}', '${matters[i].id}', '${USER_ID}', '${WORKSPACE_ID}', 'Litigation', 'active', '${inboundEmailId}', '${briefId}', NOW())
    `);
  }
  console.log(`✅ Created 10 Briefs (via Raw SQL)`);

  // 4. Create ~50 Calendar Entries
  const eventTypes = Object.values(CalendarEventType);
  for (let i = 0; i < 50; i++) {
    const matter = getRandomElement(matters);
    const date = new Date();
    date.setDate(date.getDate() + getRandomInt(-30, 60)); // Mix of past and future
    
    await prisma.calendarEntry.create({
      data: {
        matterId: matter.id,
        date: date,
        title: getRandomElement(eventTitles),
        type: getRandomElement(eventTypes),
        location: 'Court 4, 3rd Floor',
        description: 'Pre-trial conference and filing of additional witnesses.',
      }
    });
  }
  console.log(`✅ Created 50 Calendar Entries`);

  // 5. Create Expenses for all days this year so far
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const today = new Date();
  const diffDays = Math.ceil((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  
  const expenseCategories = Object.values(ExpenseCategory);
  for (let i = 0; i <= diffDays; i++) {
    const date = new Date(startOfYear);
    date.setDate(date.getDate() + i);
    
    await prisma.expense.create({
      data: {
        workspaceId: WORKSPACE_ID,
        amount: getRandomInt(5000, 50000),
        description: getRandomElement(expenseDesc),
        date: date,
        category: getRandomElement(expenseCategories),
      }
    });
  }
  console.log(`✅ Created ${diffDays + 1} Expenses`);

  // 6. Create 10 Invoices
  for (let i = 0; i < 10; i++) {
    const amount = getRandomInt(250000, 2000000);
    const subtotal = Math.round(amount / 1.075);
    const vat = amount - subtotal;
    
    await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${2024}-${500 + i}`,
        clientId: client.id,
        matterId: matters[i].id,
        date: new Date(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: getRandomElement(['pending', 'paid', 'overdue']),
        billToName: client.company || client.name,
        billToAddress: '123 Victoria Island, Lagos',
        subtotal: subtotal,
        vatAmount: vat,
        totalAmount: amount,
        items: {
          create: [
            { description: 'Professional Legal Services', amount: subtotal, quantity: 1 }
          ]
        }
      }
    });
  }
  console.log(`✅ Created 10 Invoices`);

  console.log('🏁 Demo data seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ SEEDING FAILED:');
    console.error(e);
    if (e.code) console.error(`Error Code: ${e.code}`);
    if (e.meta) console.error('Meta:', JSON.stringify(e.meta, null, 2));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
