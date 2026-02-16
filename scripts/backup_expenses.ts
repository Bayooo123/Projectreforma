import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Backing up expenses...');
    const expenses = await prisma.expense.findMany();
    console.log(`Found ${expenses.length} expenses.`);

    const backupPath = path.join(__dirname, '..', 'expenses_backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(expenses, null, 2));
    console.log(`Backup saved to ${backupPath}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
