import { PrismaClient, ExpenseCategory } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DIRECT_URL || process.env.DATABASE_URL,
        },
    },
});

// Rule-based classification
function categorize(description: string, oldCategory: string): ExpenseCategory {
    const text = (description + ' ' + oldCategory).toLowerCase();

    // 1. Court and Litigation
    if (text.match(/court|filing|legal|litigation|stamp duty|affidavit|service/)) {
        return ExpenseCategory.COURT_LITIGATION;
    }

    // 2. Staff Costs
    if (text.match(/salary|bonus|welfare|allowance|stipend|staff/)) {
        return ExpenseCategory.STAFF_COSTS;
    }

    // 3. Communication
    if (text.match(/data|subscription|internet|airtime|phone|newspaper|journal/)) {
        return ExpenseCategory.COMMUNICATION_SUBSCRIPTIONS;
    }

    // 4. Vehicle
    if (text.match(/vehicle|fuel|parking|diesel|petrol|car|taxi|uber|bolt|transport/)) {
        // If it mentions court, it might be litigation transport, but let's stick to vehicle logistics for general transport
        // Unless specifically "transport to court" which the user prompt mentioned?
        // "Vehicle and Administrative Logistics" vs "Transportation to Court (Lawyers)"
        // User prompt said: "Vehicle and Administrative Logistics"
        // And also "Transportation to Court (Lawyers)" was in the OLD category list.
        // If user prompt says: "If contains vehicle, parking, fuel (non-court) -> Vehicle and Administrative Logistics"

        if (text.match(/court/)) {
            return ExpenseCategory.COURT_LITIGATION;
        }
        return ExpenseCategory.VEHICLE_LOGISTICS;
    }

    // 5. Utilities
    if (text.match(/bulb|circuit|electrical|power|nepa|phcn|utility|water|waste/)) {
        return ExpenseCategory.OFFICE_UTILITIES;
    }

    // 6. Office Equipment
    if (text.match(/paper|stationery|ink|cartridge|printer|cleaning|repair|maintenance|furniture/)) {
        return ExpenseCategory.OFFICE_EQUIPMENT_MAINTENANCE;
    }

    // 7. Non-Litigation / Advisory
    if (text.match(/advisory|meeting|regulatory|compliance|consultation/)) {
        return ExpenseCategory.NON_LITIGATION_ADVISORY;
    }

    return ExpenseCategory.MISCELLANEOUS;
}

async function main() {
    const backupPath = path.join(__dirname, '..', 'expenses_backup.json');
    if (!fs.existsSync(backupPath)) {
        console.error('Backup file not found!');
        process.exit(1);
    }

    const rawData = fs.readFileSync(backupPath, 'utf8');
    const expenses = JSON.parse(rawData);

    console.log(`Restoring ${expenses.length} expenses...`);

    // We will delete all existing expenses (which might be corrupted or empty after schema push)
    // to ensure a clean slate, or we can upsert. Since IDs are preserved, upsert/create is fine.
    // Actually, schema push might have dropped the column, keeping the rows.
    // If rows exist, we update. If not, we create.
    // But wait, if column is dropped, the data for that column is gone. The rows might remain with default value if I set one, or Prisma might have cleared table.
    // Safer to just delete all and re-create to ensure consistency.

    await prisma.expense.deleteMany({}); // Clear table

    for (const exp of expenses) {
        const newCategory = categorize(exp.description || '', exp.category || '');

        await prisma.expense.create({
            data: {
                id: exp.id,
                workspaceId: exp.workspaceId,
                amount: exp.amount,
                description: exp.description || '', // Restore description even if now optional
                date: new Date(exp.date),
                reference: exp.reference,
                createdAt: new Date(exp.createdAt),
                updatedAt: new Date(exp.updatedAt),
                category: newCategory
            }
        });
        console.log(`Restored: ${exp.description} -> ${newCategory}`);
    }

    console.log('Migration complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
