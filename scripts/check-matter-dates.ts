
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
    console.log('--- CHECKING MATTER TABLE DIRECTLY ---');

    const workspace = await prisma.workspace.findFirst({
        where: { OR: [{ slug: 'ascolp' }, { name: { contains: 'ascolp', mode: 'insensitive' } }] }
    });

    if (!workspace) {
        console.error('ASCOLP Workspace not found!');
        return;
    }

    const matters = await prisma.matter.findMany({
        where: {
            workspaceId: workspace.id,
            nextCourtDate: { not: null }
        },
        select: {
            name: true,
            caseNumber: true,
            nextCourtDate: true,
            client: { select: { name: true } }
        },
        orderBy: { nextCourtDate: 'asc' }
    });

    console.log(`Found ${matters.length} matters with a nextCourtDate set:`);
    matters.forEach(m => {
        console.log(`[${m.nextCourtDate.toISOString().split('T')[0]}] ${m.name} (${m.caseNumber}) - Client: ${m.client?.name || 'NONE'}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
