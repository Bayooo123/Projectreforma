
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting ASCOLP Data Restoration...');

    // 1. Identify Workspace
    const workspace = await prisma.workspace.findFirst({
        where: { name: { contains: 'ASCOLP', mode: 'insensitive' } }
    });

    if (!workspace) {
        console.error('❌ ASCOLP Workspace not found!');
        return;
    }

    console.log(`📍 Using Workspace: ${workspace.name} (${workspace.id})`);

    // 2. Identify primary lawyer/owner
    const profSanni = await prisma.user.findUnique({
        where: { email: 'Asanni@abiolasanniandco.com' }
    });

    if (!profSanni) {
        console.error('❌ Professor Sanni user not found!');
        return;
    }

    const lawyerId = profSanni.id;

    // 3. Restore Clients
    const clientsData = [
        { name: 'Chief Daramola', email: 'daramola@client.temp', id: 'cmjn6t43300013c2ikoy36gd0' },
        { name: 'Arik air', email: 'arik@client.temp', id: 'cmjvjsjx40001tkd1by7qztt3' },
        { name: 'Chevron Nigeria Limited', email: 'chevron@client.temp', id: 'cmjvkfhpt0001zx4rr9c7zcfh' }
    ];

    console.log('👥 Restoring Clients...');
    for (const c of clientsData) {
        await prisma.client.upsert({
            where: { id: c.id },
            update: { workspaceId: workspace.id, name: c.name },
            create: {
                id: c.id,
                name: c.name,
                email: c.email,
                workspaceId: workspace.id
            }
        });
        console.log(`   ✅ Restored Client: ${c.name}`);
    }

    // 4. Restore Matters
    const mattersData = [
        { name: 'A v. K', clientId: 'cmjvjsjx40001tkd1by7qztt3' },
        { name: 'State v. Arik Air', clientId: 'cmjvjsjx40001tkd1by7qztt3' }
    ];

    console.log('📂 Restoring Matters...');
    for (const m of mattersData) {
        await prisma.matter.create({
            data: {
                name: m.name,
                workspaceId: workspace.id,
                clientId: m.clientId,
                status: 'active'
            }
        });
        console.log(`   ✅ Restored Matter: ${m.name}`);
    }

    // 5. Restore Briefs
    const briefsData = [
        {
            id: 'cmjn6u0w500043c2i1dppubsg',
            briefNumber: '001',
            name: 'Chief Daramola',
            clientId: 'cmjn6t43300013c2ikoy36gd0',
            category: 'Litigation',
            createdAt: new Date('2025-12-26T18:11:15.078Z')
        },
        {
            id: 'cmjvjsm1l0004tkd1uq88gxin',
            briefNumber: '002',
            name: 'ARIK AIR ',
            clientId: 'cmjvjsjx40001tkd1by7qztt3',
            category: 'Litigation',
            createdAt: new Date('2026-01-01T14:36:13.593Z')
        },
        {
            id: 'cmjvmz8ke0002snhypfisc541',
            briefNumber: '700',
            name: 'Chevron Nigeria Limited v. Bayelsa State Inland Revenue Board',
            clientId: 'cmjvkfhpt0001zx4rr9c7zcfh',
            category: 'Litigation',
            createdAt: new Date('2026-01-01T16:05:21.566Z')
        }
    ];

    console.log('⚖️ Restoring Briefs...');
    for (const b of briefsData) {
        await prisma.brief.upsert({
            where: { id: b.id },
            update: {
                workspaceId: workspace.id,
                name: b.name,
                briefNumber: b.briefNumber
            },
            create: {
                id: b.id,
                briefNumber: b.briefNumber,
                name: b.name,
                workspaceId: workspace.id,
                clientId: b.clientId,
                lawyerId: lawyerId,
                category: b.category,
                status: 'active',
                createdAt: b.createdAt
            }
        });
        console.log(`   ✅ Restored Brief: ${b.briefNumber} - ${b.name}`);
    }

    console.log('\n✨ Restoration Complete!');
}

main()
    .catch(e => {
        console.error('❌ Restoration Failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
