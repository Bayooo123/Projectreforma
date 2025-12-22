
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Attempting to add revenuePin column manually...");
    try {
        const result = await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'Workspace'
          AND column_name = 'revenuePin'
        ) THEN
          ALTER TABLE "Workspace" ADD COLUMN "revenuePin" TEXT;
          RAISE NOTICE 'Added revenuePin column';
        ELSE
          RAISE NOTICE 'revenuePin column already exists';
        END IF;
      END
      $$;
    `);
        console.log("Command executed successfully.", result);
    } catch (error) {
        console.error("Error executing raw SQL:");
        console.error(error);
        process.exit(1);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
