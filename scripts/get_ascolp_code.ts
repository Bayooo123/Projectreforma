
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const workspace = await prisma.workspace.findFirst({
        where: { name: { contains: 'ASCOLP', mode: 'insensitive' } }
    });
    console.log(`Firm Code: ${workspace?.firmCode}`);
}

main().finally(() => prisma.$disconnect());
