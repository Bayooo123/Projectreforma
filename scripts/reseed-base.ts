import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Reseeding base data...');

    const owner = await prisma.user.create({
        data: {
            email: 'bayo@abiolasanniandco.com',
            name: 'Adebayo Gbadebo',
            jobTitle: 'Associate'
        }
    });

    const workspace = await prisma.workspace.create({
        data: {
            name: 'ASCOLP',
            slug: 'ascolp',
            ownerId: owner.id,
            firmCode: 'ASCOLP'
        }
    });

    await prisma.workspaceMember.create({
        data: {
            workspaceId: workspace.id,
            userId: owner.id,
            role: 'owner',
            designation: 'Associate'
        }
    });

    const additionalLawyers = [
        { name: "Professor Abiola Sanni, SAN", email: "asanni@abiolasanniandco.com", designation: "Managing Partner" },
        { name: "Kola Abdulsalam", email: "kola@abiolasanniandco.com", designation: "Head of Chambers" },
        { name: "Deji Popoola", email: "deji@abiolasanniandco.com", designation: "Head of IT" },
    ];

    for (const lawyer of additionalLawyers) {
        const user = await prisma.user.create({
            data: {
                email: lawyer.email,
                name: lawyer.name,
                jobTitle: lawyer.designation
            }
        });

        await prisma.workspaceMember.create({
            data: {
                workspaceId: workspace.id,
                userId: user.id,
                role: 'member',
                designation: lawyer.designation
            }
        });
    }

    console.log('✅ Base data reseeded.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
