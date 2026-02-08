
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
    console.log('--- SCANNING ACTIVITY LOGS FOR DATE TEXT ---');

    const workspace = await prisma.workspace.findFirst({
        where: { OR: [{ slug: 'ascolp' }, { name: { contains: 'ascolp', mode: 'insensitive' } }] }
    });

    if (!workspace) { return; }

    const logs = await prisma.matterActivityLog.findMany({
        where: {
            matter: { workspaceId: workspace.id },
            description: { contains: '2026', mode: 'insensitive' }
        },
        include: { matter: { select: { name: true } } },
        orderBy: { timestamp: 'desc' }
    });

    console.log(`Found ${logs.length} logs mentioning '2026':`);
    logs.forEach(l => {
        console.log(`[${l.timestamp.toISOString().split('T')[0]}] ${l.matter.name}: ${l.description}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
