import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ws = await prisma.workspace.findMany();
  ws.forEach(w => console.log(`${w.id} : ${w.name}`));
}

main().finally(() => prisma.$disconnect());
