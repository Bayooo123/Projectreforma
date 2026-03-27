import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'dhaveedace@gmail.com';
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      workspaces: {
        include: { workspace: true }
      }
    }
  });

  if (!user) {
    console.error('User not found');
    return;
  }

  console.log(`User ${email} (ID: ${user.id}) is a member of:`);
  user.workspaces.forEach(m => {
    console.log(` - ${m.workspace.id} : ${m.workspace.name} (Role: ${m.role})`);
  });
}

main().finally(() => prisma.$disconnect());
