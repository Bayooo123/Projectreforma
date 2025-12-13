
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTables() {
    console.log('🔍 CHECKING DATABASE TABLES...');

    const tables = [
        'User', 'Workspace', 'WorkspaceMember', 'Brief', 'Document',
        'Matter', 'Client', 'Notification', 'Task', 'Expense', 'Invoice'
    ];

    for (const table of tables) {
        try {
            // Try to count records. If table missing, this throws.
            const count = await prisma[table.toLowerCase()].count();
            console.log(`✅ Table "${table}" exists. Count: ${count}`);
        } catch (error) {
            if (error.code === 'P2021') {
                console.log(`❌ Table "${table}" DOES NOT EXIST.`);
            } else {
                console.log(`⚠️ Error checking "${table}":`, error.message.split('\n')[0]);
            }
        }
    }

    await prisma.$disconnect();
}

checkTables();
