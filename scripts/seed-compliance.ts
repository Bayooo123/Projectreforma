
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OBLIGATIONS = [
    // FEDERAL OBLIGATIONS
    {
        tier: 'Federal',
        jurisdiction: 'Federal',
        regulatoryBody: 'FIRS',
        nature: 'Tax',
        actionRequired: 'Company Income Tax (CIT) Filing',
        procedure: 'File audited accounts and tax computations with FIRS.',
        frequency: 'Annual',
        dueDateDescription: '6 months after financial year end'
    },
    {
        tier: 'Federal',
        jurisdiction: 'Federal',
        regulatoryBody: 'FIRS',
        nature: 'Tax',
        actionRequired: 'Value Added Tax (VAT) Filing',
        procedure: 'File VAT returns for previous month transactions.',
        frequency: 'Monthly',
        dueDateDescription: '21st of every month'
    },
    {
        tier: 'Federal',
        jurisdiction: 'Federal',
        regulatoryBody: 'FIRS',
        nature: 'Tax',
        actionRequired: 'Education Tax Filing',
        procedure: 'File alongside CIT returns.',
        frequency: 'Annual',
        dueDateDescription: '6 months after financial year end'
    },
    {
        tier: 'Federal',
        jurisdiction: 'Federal',
        regulatoryBody: 'ITF',
        nature: 'Levy',
        actionRequired: 'Industrial Training Fund (ITF) Contribution',
        procedure: 'Pay 1% of annual payroll if staff > 5 or turnover > 50m.',
        frequency: 'Annual',
        dueDateDescription: '31st March of following year'
    },
    {
        tier: 'Federal',
        jurisdiction: 'Federal',
        regulatoryBody: 'NSITF',
        nature: 'Levy',
        actionRequired: 'Employee Compensation Scheme (NSITF)',
        procedure: 'Pay 1% of monthly payroll.',
        frequency: 'Monthly',
        dueDateDescription: 'Last day of the month'
    },
    {
        tier: 'Federal',
        jurisdiction: 'Federal',
        regulatoryBody: 'PENCOM',
        nature: 'Pension',
        actionRequired: 'Pension Remittance',
        procedure: 'Remit employee (8%) and employer (10%) contributions to PFAs.',
        frequency: 'Monthly',
        dueDateDescription: '7 days after salary payment'
    },
    {
        tier: 'Federal',
        jurisdiction: 'Federal',
        regulatoryBody: 'CAC',
        nature: 'Corporate',
        actionRequired: 'Annual Returns',
        procedure: 'File annual returns with CAC to maintain active status.',
        frequency: 'Annual',
        dueDateDescription: 'Within 42 days of AGM'
    },

    // STATE OBLIGATIONS (LAGOS)
    {
        tier: 'State',
        jurisdiction: 'Lagos',
        regulatoryBody: 'LIRS',
        nature: 'Tax',
        actionRequired: 'PAYE Filing & Remittance',
        procedure: 'Remit PAYE deductions from employee salaries.',
        frequency: 'Monthly',
        dueDateDescription: '10th of every month'
    },
    {
        tier: 'State',
        jurisdiction: 'Lagos',
        regulatoryBody: 'LIRS',
        nature: 'Tax',
        actionRequired: 'Withholding Tax (WHT) Remittance',
        procedure: 'Remit WHT deducted from vendors/suppliers.',
        frequency: 'Monthly',
        dueDateDescription: '21st of every month'
    },
    {
        tier: 'State',
        jurisdiction: 'Lagos',
        regulatoryBody: 'LIRS',
        nature: 'Tax',
        actionRequired: 'Business Premises Levy',
        procedure: 'Pay annual levy for business premises operating in Lagos.',
        frequency: 'Annual',
        dueDateDescription: 'First quarter of the year'
    },
    {
        tier: 'State',
        jurisdiction: 'Lagos',
        regulatoryBody: 'LIRS',
        nature: 'Tax',
        actionRequired: 'Development Levy',
        procedure: 'Pay N100 per annum for every taxable person in employment.',
        frequency: 'Annual',
        dueDateDescription: 'Usually with tax clearance application'
    },
    {
        tier: 'State',
        jurisdiction: 'Lagos',
        regulatoryBody: 'LIRS',
        nature: 'Tax',
        actionRequired: 'Direct Assessment',
        procedure: 'For self-employed individuals/directors (if applicable).',
        frequency: 'Annual',
        dueDateDescription: '31st March'
    }
];

async function main() {
    console.log('🌱 Starting Compliance Seeding...');

    // 1. Wipe existing compliance data (optional, but requested for "Reset")
    console.log('🗑️  Clearing existing compliance data...');
    // Note: We are deleting tasks first to avoid FK constraints, but we might want to keep history?
    // For a hard reset as requested:
    await prisma.complianceHistory.deleteMany({});
    await prisma.complianceTask.deleteMany({});
    await prisma.complianceObligation.deleteMany({});

    console.log('✅ Cleared existing data.');

    // 2. Seed Obligations
    console.log('📝 Seeding Obligations...');
    for (const obligation of OBLIGATIONS) {
        await prisma.complianceObligation.create({
            data: obligation
        });
    }
    console.log(`✅ Seeded ${OBLIGATIONS.length} obligations.`);

    // 3. Auto-assign to existing workspaces
    const workspaces = await prisma.workspace.findMany();
    const obligations = await prisma.complianceObligation.findMany();

    console.log(`🔗 Assigning obligations to ${workspaces.length} workspaces...`);

    for (const workspace of workspaces) {
        // Create a task for each obligation for the workspace
        // This is a simplified "initial state" - normally we'd check if it exists
        const tasksData = obligations.map(obl => ({
            workspaceId: workspace.id,
            obligationId: obl.id,
            status: 'pending',
            dueDate: new Date(), // Placeholder - in real app, calculate based on rule
            period: 'Current Cycle'
        }));

        await prisma.complianceTask.createMany({
            data: tasksData
        });
    }

    console.log('✅ Compliance Reset Complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
