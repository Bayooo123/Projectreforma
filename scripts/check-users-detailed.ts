
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
    console.log('--- FINDING USER ACCOUNTS ---');

    const users = await prisma.user.findMany({
        where: {
            OR: [
                { email: { contains: 'ascolp', mode: 'insensitive' } },
                { email: { contains: 'sanni', mode: 'insensitive' } },
                { name: { contains: 'ascolp', mode: 'insensitive' } },
                { name: { contains: 'sanni', mode: 'insensitive' } }
            ]
        },
        include: {
            ownedWorkspaces: true,
            workspaces: {
                include: { workspace: true }
            }
        }
    });

    console.log(`Found ${users.length} users:`);
    for (const user of users) {
        console.log(`\nUser: ${user.name} (${user.email})`);

        if (user.ownedWorkspaces.length > 0) {
            console.log('  Owned Workspaces:');
            user.ownedWorkspaces.forEach(ws => console.log(`    - ${ws.name} (ID: ${ws.id})`));
        }

        if (user.workspaces.length > 0) {
            console.log('  Member Workspaces:');
            user.workspaces.forEach(m => console.log(`    - ${m.workspace.name} (ID: ${m.workspace.id})`));
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
