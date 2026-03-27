import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const workspaceName = 'Gbadebo';
  const email = 'dhaveedace@gmail.com';

  console.log(`Searching for workspace containing: ${workspaceName}`);
  const workspaces = await prisma.workspace.findMany({
    where: { name: { contains: workspaceName, mode: 'insensitive' } }
  });
  console.log('Workspaces:', JSON.stringify(workspaces, null, 2));

  console.log(`Searching for user: ${email}`);
  const user = await prisma.user.findUnique({
    where: { email },
    include: { workspaces: true }
  });
  console.log('User:', JSON.stringify(user, null, 2));
}

main().finally(() => prisma.$disconnect());
