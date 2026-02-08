
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
    console.log('--- LISTING ALL WORKSPACES (Ordered by Creation Date) ---');

    const workspaces = await prisma.workspace.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            owner: { select: { name: true, email: true } }
        }
    });

    console.log(`Found ${workspaces.length} total workspaces:`);

    for (const ws of workspaces) {
        // Count count dates
        const courtDateCount = await prisma.courtDate.count({
            where: { matter: { workspaceId: ws.id } }
        });

        console.log(`\n[${ws.createdAt.toISOString().split('T')[0]}] Name: ${ws.name} (Slug: ${ws.slug})`);
        console.log(`   ID: ${ws.id}`);
        console.log(`   Owner: ${ws.owner.name} (${ws.owner.email})`);
        console.log(`   Court Dates: ${courtDateCount}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
