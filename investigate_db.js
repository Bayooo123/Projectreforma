const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Brief'
      ORDER BY ordinal_position
    `;
    console.log('Brief table columns:');
    columns.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });

    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('\nAll tables:');
    console.log(tables.map(t => t.table_name).join(', '));

  } catch (error) {
    console.error('Database investigation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
