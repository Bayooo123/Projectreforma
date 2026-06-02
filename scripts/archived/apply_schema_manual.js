const { Client } = require('pg');
const connectionString = "postgresql://postgres.veltyrhvxeiwbhptvczc:REFORMISFROMGOD122%40@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";

async function applySchema() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('Connected to database.');

        console.log('Creating ExpenseCategory enum...');
        await client.query(`
      DO $$ BEGIN
        CREATE TYPE "ExpenseCategory" AS ENUM (
          'OFFICE_UTILITIES',
          'OFFICE_EQUIPMENT_MAINTENANCE',
          'COURT_LITIGATION',
          'NON_LITIGATION_ADVISORY',
          'COMMUNICATION_SUBSCRIPTIONS',
          'STAFF_COSTS',
          'VEHICLE_LOGISTICS',
          'MISCELLANEOUS'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

        console.log('Updating Expense table structure...');
        // We drop the category and description columns and recreate them to match the new schema
        // Since we are accepting data loss/restoring from backup, this is safe.
        await client.query(`
      ALTER TABLE "Expense" DROP COLUMN IF EXISTS "category";
      ALTER TABLE "Expense" ADD COLUMN "category" "ExpenseCategory" NOT NULL DEFAULT 'MISCELLANEOUS';
      
      ALTER TABLE "Expense" ALTER COLUMN "description" DROP NOT NULL;
    `);

        console.log('Schema changes applied successfully.');
        await client.end();
    } catch (err) {
        console.error('Error applying schema:', err.message);
        process.exit(1);
    }
}

applySchema();
