
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const matters = await prisma.matter.findMany({
        where: { name: { contains: 'Felix' } },
        select: { id: true, name: true, opponentName: true, client: { select: { name: true } } }
    });
    console.log(`FOUND ${matters.length} MATTERS FOR 'Felix':`);
    matters.forEach(m => console.log(`ID: ${m.id} | Name: "${m.name}" | Client: "${m.client?.name}" | Opponent: "${m.opponentName}"`));
    await prisma.$disconnect();
}
main();
