const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = "postgresql://postgres.veltyrhvxeiwbhptvczc:REFORMISFROMGOD122%40@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";

// Rule-based classification
function categorize(description, oldCategory) {
    const text = ((description || '') + ' ' + (oldCategory || '')).toLowerCase();

    if (text.match(/court|filing|legal|litigation|stamp duty|affidavit|service/)) {
        return 'COURT_LITIGATION';
    }
    if (text.match(/salary|bonus|welfare|allowance|stipend|staff/)) {
        return 'STAFF_COSTS';
    }
    if (text.match(/data|subscription|internet|airtime|phone|newspaper|journal/)) {
        return 'COMMUNICATION_SUBSCRIPTIONS';
    }
    if (text.match(/vehicle|fuel|parking|diesel|petrol|car|taxi|uber|bolt|transport/)) {
        if (text.match(/court/)) return 'COURT_LITIGATION';
        return 'VEHICLE_LOGISTICS';
    }
    if (text.match(/bulb|circuit|electrical|power|nepa|phcn|utility|water|waste/)) {
        return 'OFFICE_UTILITIES';
    }
    if (text.match(/paper|stationery|ink|cartridge|printer|cleaning|repair|maintenance|furniture/)) {
        return 'OFFICE_EQUIPMENT_MAINTENANCE';
    }
    if (text.match(/advisory|meeting|regulatory|compliance|consultation/)) {
        return 'NON_LITIGATION_ADVISORY';
    }

    return 'MISCELLANEOUS';
}

async function main() {
    const backupPath = path.join(__dirname, '..', 'expenses_backup.json');
    if (!fs.existsSync(backupPath)) {
        console.error('Backup file not found!');
        process.exit(1);
    }

    const rawData = fs.readFileSync(backupPath, 'utf8');
    const expenses = JSON.parse(rawData);

    console.log(`Restoring ${expenses.length} expenses using pg...`);

    const client = new Client({ connectionString });
    try {
        await client.connect();

        console.log('Clearing Expense table...');
        await client.query('DELETE FROM "Expense"');

        for (const exp of expenses) {
            const newCategory = categorize(exp.description, exp.category);

            const query = {
                text: 'INSERT INTO "Expense"(id, "workspaceId", amount, description, date, reference, "createdAt", "updatedAt", category) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                values: [
                    exp.id,
                    exp.workspaceId,
                    exp.amount,
                    exp.description || '',
                    new Date(exp.date),
                    exp.reference,
                    new Date(exp.createdAt),
                    new Date(exp.updatedAt),
                    newCategory
                ],
            };

            await client.query(query);
            console.log(`Restored: ${exp.description} -> ${newCategory}`);
        }

        console.log('Restoration complete.');
        await client.end();
    } catch (err) {
        console.error('Migration error:', err.message);
        process.exit(1);
    }
}

main();
