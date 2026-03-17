require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const workspace = await prisma.workspace.findFirst({
    where: { name: { contains: 'ASCOLP', mode: 'insensitive' } },
    include: {
      members: {
        include: {
          user: true
        }
      }
    }
  });

  if (!workspace) {
    console.log('Workspace ASCOLP not found');
    return;
  }

  console.log('--- Workspace ---');
  console.log('ID:', workspace.id);
  console.log('Name:', workspace.name);
  console.log('Owner ID:', workspace.ownerId);

  console.log('\n--- Members ---');
  workspace.members.forEach(m => {
    console.log(`${m.user.name} (${m.user.email}) - Role: ${m.role}, ID: ${m.id}, UserID: ${m.user.id}, Joined: ${m.joinedAt}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
