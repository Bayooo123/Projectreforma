import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const obligations = [
        // Federal Obligations
        {
            tier: 'federal',
            regulatoryBody: 'FIRS',
            nature: 'filing / payment',
            actionRequired: 'VAT filing and remittance',
            procedure: 'File via FIRS Taxpro Max portal',
            frequency: 'monthly',
            dueDateDescription: '21st day of the following month',
            jurisdiction: 'Federal',
        },
        {
            tier: 'federal',
            regulatoryBody: 'PenCom',
            nature: 'payment',
            actionRequired: 'Pension contributions',
            procedure: 'Remit via bank / PFA portal',
            frequency: 'monthly',
            dueDateDescription: '7 working days after salary payment',
            jurisdiction: 'Federal',
        },
        {
            tier: 'federal',
            regulatoryBody: 'NHIS',
            nature: 'payment',
            actionRequired: 'Health insurance contributions',
            procedure: 'Remit via NHIS portal',
            frequency: 'monthly',
            dueDateDescription: 'Monthly',
            jurisdiction: 'Federal',
        },
        {
            tier: 'federal',
            regulatoryBody: 'CAC',
            nature: 'filing',
            actionRequired: 'Filing of statutory annual returns',
            procedure: 'File via CAC Post-incorporation portal',
            frequency: 'annually',
            dueDateDescription: 'Annually (varies by registration date)',
            jurisdiction: 'Federal',
        },
        // State Obligations (Lagos)
        {
            tier: 'state',
            regulatoryBody: 'LIRS',
            nature: 'payment',
            actionRequired: 'PAYE (Personal Income Tax)',
            procedure: 'Remit via LIRS e-Tax portal',
            frequency: 'monthly',
            dueDateDescription: '10th day of the following month',
            jurisdiction: 'Lagos',
        },
        {
            tier: 'state',
            regulatoryBody: 'LIRS',
            nature: 'filing',
            actionRequired: 'Direct Assessment / Annual Returns',
            procedure: 'File H3 returns via LIRS portal',
            frequency: 'annually',
            dueDateDescription: 'March 31st each year',
            jurisdiction: 'Lagos',
        },
        // Local Obligations
        {
            tier: 'local',
            regulatoryBody: 'Local Government Council',
            nature: 'payment',
            actionRequired: 'Refuse / Waste Management Dues',
            procedure: 'Pay to designated LAWMA/LGC account',
            frequency: 'monthly',
            dueDateDescription: 'Monthly',
            jurisdiction: 'Lagos',
        },
        {
            tier: 'local',
            regulatoryBody: 'Local Government Council',
            nature: 'payment',
            actionRequired: 'Property-related Levies',
            procedure: 'Pay via Local Government Revenue office',
            frequency: 'annually',
            dueDateDescription: 'Annually',
            jurisdiction: 'Lagos',
        },
    ];

    console.log('Seeding compliance obligations...');

    for (const ob of obligations) {
        const existing = await prisma.complianceObligation.findFirst({
            where: {
                actionRequired: ob.actionRequired,
                regulatoryBody: ob.regulatoryBody,
                jurisdiction: ob.jurisdiction,
            }
        });

        if (!existing) {
            await prisma.complianceObligation.create({ data: ob });
            console.log(`Created: ${ob.actionRequired}`);
        } else {
            console.log(`Skipped (exists): ${ob.actionRequired}`);
        }
    }

    // Initialize tasks for all workspaces
    console.log('Initializing compliance tasks for all workspaces...');
    const workspaces = await prisma.workspace.findMany();
    const allObligations = await prisma.complianceObligation.findMany();

    for (const ws of workspaces) {
        for (const ob of allObligations) {
            const existingTask = await prisma.complianceTask.findFirst({
                where: {
                    workspaceId: ws.id,
                    obligationId: ob.id,
                    status: 'pending' // Only create if no pending task exists
                }
            });

            if (!existingTask) {
                await prisma.complianceTask.create({
                    data: {
                        workspaceId: ws.id,
                        obligationId: ob.id,
                        status: 'pending',
                    }
                });
            }
        }
        console.log(`Initialized tasks for workspace: ${ws.name}`);
    }

    console.log('Compliance seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
