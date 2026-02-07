import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tables = ['Workspace', 'User', 'WorkspaceMember'];
    for (const table of tables) {
        const count = await (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)].count();
        console.log(`${table}: ${count} records`);
    }
}

main().finally(() => prisma.$disconnect());
