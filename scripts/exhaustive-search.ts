import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Global Data Search ---');

    // 1. List all schemas
    const schemas: any[] = await prisma.$queryRaw`SELECT schema_name FROM information_schema.schemata`;
    console.log('Schemas:', schemas.map(s => s.schema_name).join(', '));

    // 2. Search for ASCOLP string in ALL tables in ALL schemas
    const tables: any[] = await prisma.$queryRaw`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_type = 'BASE TABLE' 
    AND table_schema NOT IN ('information_schema', 'pg_catalog')
  `;

    for (const t of tables) {
        try {
            const result: any[] = await prisma.$queryRawUnsafe(`SELECT count(*) as count FROM "${t.table_schema}"."${t.table_name}"`);
            const count = Number(result[0].count);
            if (count > 0) {
                console.log(`[${t.table_schema}.${t.table_name}] Count: ${count}`);

                // Check for ASCOLP
                // This is expensive, just checking core tables for name matches
                if (['Workspace', 'User', 'Brief', 'Matter', 'Client'].includes(t.table_name)) {
                    const matches: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "${t.table_schema}"."${t.table_name}" LIMIT 5`);
                    console.log(` Sample:`, matches.map(m => m.name || m.email || m.id));
                }
            }
        } catch (e) {
            // Skip failed queries
        }
    }

    console.log('--- Search Complete ---');
}

main().finally(() => prisma.$disconnect());
