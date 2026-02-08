
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
    console.log('--- FINDING USER WORKSPACES ---');

    // Find User by email
    const user = await prisma.user.findFirst({
        where: { email: { contains: 'asanni@abiolasanniandco.com', mode: 'insensitive' } },
        include: {
            workspaces: {
                include: { workspace: true }
            },
            ownedWorkspaces: true
        }
    });

    if (!user) {
        console.log('User not found.');
        return;
    }

    console.log(`User: ${user.name} (${user.email})`);

    console.log('\n--- OWNED WORKSPACES ---');
    user.ownedWorkspaces.forEach(ws => {
        console.log(`- ${ws.name} (ID: ${ws.id}) [Created: ${ws.createdAt.toISOString().split('T')[0]}]`);
    });

    console.log('\n--- MEMBER WORKSPACES ---');
    user.workspaces.forEach(m => {
        console.log(`- ${m.workspace.name} (ID: ${m.workspace.id}) [Role: ${m.role}]`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
