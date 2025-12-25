
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectSchema() {
    try {
        // Check columns for User table
        const userColumns: any = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User'
    `;

        // Check columns for Workspace table
        const workspaceColumns: any = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Workspace'
    `;

        console.log('--- USER TABLE COLUMNS ---');
        userColumns.forEach((col: any) => console.log(col.column_name));

        console.log('\n--- WORKSPACE TABLE COLUMNS ---');
        workspaceColumns.forEach((col: any) => console.log(col.column_name));

    } catch (error) {
        console.error('Error inspecting schema:', error);
    } finally {
        await prisma.$disconnect();
    }
}

inspectSchema();
