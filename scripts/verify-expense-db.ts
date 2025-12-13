
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Expense Persistence Verification...');

    // 1. Get a test workspace (or create one if needed, but assuming one exists)
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) {
        console.error('No workspace found. Please migrate/seed database first.');
        process.exit(1);
    }
    console.log(`Using workspace: ${workspace.name} (${workspace.id})`);

    // 2. Create a test expense
    const testAmount = 500000; // 5000.00
    const testDesc = 'Verification Test Expense ' + Date.now();

    console.log('Creating test expense...');
    const expense = await prisma.expense.create({
        data: {
            workspaceId: workspace.id,
            category: 'Other',
            amount: testAmount,
            description: testDesc,
            date: new Date(),
            reference: 'TEST-VERIFY'
        }
    });
    console.log(`Created expense with ID: ${expense.id}`);

    // 3. Read it back
    console.log('Reading back expense...');
    const retrieved = await prisma.expense.findUnique({
        where: { id: expense.id }
    });

    if (!retrieved) {
        console.error('FAILED: Could not retrieve the expense immediately after creation!');
        process.exit(1);
    }

    if (retrieved.description !== testDesc || retrieved.amount !== testAmount) {
        console.error('FAILED: Retrieved data does not match created data!');
        console.error('Expected:', { description: testDesc, amount: testAmount });
        console.error('Got:', retrieved);
        process.exit(1);
    }

    console.log('SUCCESS: Expense persisted and verified correctly.');

    // 4. Cleanup
    console.log('Cleaning up test expense...');
    await prisma.expense.delete({ where: { id: expense.id } });
    console.log('Cleanup done.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
