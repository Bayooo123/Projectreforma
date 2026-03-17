require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
console.log('DB URL check:', process.env.DATABASE_URL ? 'Present' : 'Missing');
const prisma = new PrismaClient();

async function main() {
  const workspaces = await prisma.workspace.findMany({
    where: { name: { contains: 'ASCOLP', mode: 'insensitive' } },
    select: { id: true, name: true }
  });
  console.log('Workspaces:', JSON.stringify(workspaces, null, 2));

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'Adebayo', mode: 'insensitive' } },
        { name: { contains: 'Benjamin', mode: 'insensitive' } }
      ]
    },
    select: { id: true, name: true, email: true }
  });
  console.log('Users:', JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
