
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

// Manual .env loading
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
}

async function main() {
    console.log('--- SEARCHING FOR ALL ASCOLP WORKSPACES ---');

    const workspaces = await prisma.workspace.findMany({
        where: {
            OR: [
                { slug: { contains: 'ascolp', mode: 'insensitive' } },
                { name: { contains: 'ascolp', mode: 'insensitive' } },
                { name: { contains: 'Abiola Sanni', mode: 'insensitive' } } // Also check full firm name
            ]
        },
        include: {
            _count: {
                select: {
                    matters: true,
                    members: true
                }
            }
        }
    });

    console.log(`Found ${workspaces.length} potential workspaces:`);

    for (const ws of workspaces) {
        // Count court dates via matters for this workspace
        const courtDateCount = await prisma.courtDate.count({
            where: { matter: { workspaceId: ws.id } }
        });

        console.log(`\nWORKSPACE: ${ws.name}`);
        console.log(`ID: ${ws.id}`);
        console.log(`Slug: ${ws.slug}`);
        console.log(`Created At: ${ws.createdAt.toISOString()}`);
        console.log(`Matters: ${ws._count.matters}`);
        console.log(`Court Dates (Actual): ${courtDateCount}`);
        console.log(`Members: ${ws._count.members}`);

        if (courtDateCount > 0) {
            const latestDate = await prisma.courtDate.findFirst({
                where: { matter: { workspaceId: ws.id } },
                orderBy: { date: 'desc' }
            });
            console.log(`Latest Court Date: ${latestDate?.date.toISOString() || 'None'}`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
