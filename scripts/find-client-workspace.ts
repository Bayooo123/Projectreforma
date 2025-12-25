
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findClientWorkspace() {
    try {
        // Fetch all clients to perform safe filtering in JS (avoids column name guessing issues in SQL)
        const clients: any = await prisma.$queryRaw`SELECT * FROM "Client"`;

        console.log(`Total Clients in DB: ${clients.length}`);

        const searchMock = 'daramola';

        const matches = clients.filter((c: any) => {
            // Construct a full name string from likely columns
            const parts = [
                c.firstName,
                c.lastName,
                c.name,
                c.companyName,
                c.email
            ].filter(Boolean).join(' ').toLowerCase();

            return parts.includes(searchMock);
        });

        if (matches.length === 0) {
            console.log(`No client found matching '${searchMock}'.`);
        } else {
            console.log(`Found ${matches.length} matching client(s):`);
            for (const client of matches) {
                const nameDisplay = client.name || `${client.firstName} ${client.lastName}`;
                console.log(`\n[MATCH] Client: ${nameDisplay}`);
                console.log(`ID: ${client.id}`);

                const wsId = client.workspaceId || client.workspace_id;

                if (wsId) {
                    // Fetch Workspace details
                    const workspaces: any = await prisma.$queryRaw`SELECT * FROM "Workspace" WHERE id = ${wsId}`;
                    if (workspaces.length > 0) {
                        const ws = workspaces[0];
                        console.log(`-> BELONGS TO WORKSPACE: "${ws.name}"`);
                        console.log(`   Firm Code: ${ws.firmCode}`);
                        console.log(`   Workspace ID: ${ws.id}`);
                    } else {
                        console.log(`-> Workspace NOT FOUND for ID: ${wsId}`);
                    }
                } else {
                    console.log("-> No Workspace ID linked.");
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

findClientWorkspace();
