import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Clear existing data
    await prisma.lexMessage.deleteMany();
    await prisma.lexConversation.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.invoiceItem.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.brief.deleteMany();
    await prisma.clientCommunication.deleteMany();
    await prisma.matterActivityLog.deleteMany();
    await prisma.matter.deleteMany();
    await prisma.client.deleteMany();
    await prisma.workspaceMember.deleteMany();
    await prisma.invitation.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
    await prisma.workspace.deleteMany();

    // Create workspace
    const workspace = await prisma.workspace.create({
        data: {
            name: 'ASCO Law Partners',
            slug: 'asco-lp',
            plan: 'pro',
            ownerId: 'temp-owner-id',
        },
    });

    // Create users
    const hashedPassword = await bcrypt.hash('password123', 10);

    const owner = await prisma.user.create({
        data: {
            name: 'Barrister Adeyemi',
            email: 'adeyemi@ascolp.com',
            password: hashedPassword,
            isActive: true,
        },
    });

    const lawyer1 = await prisma.user.create({
        data: {
            name: 'Barrister Okonkwo',
            email: 'okonkwo@ascolp.com',
            password: hashedPassword,
            isActive: true,
        },
    });

    const lawyer2 = await prisma.user.create({
        data: {
            name: 'Barrister Bello',
            email: 'bello@ascolp.com',
            password: hashedPassword,
            isActive: true,
        },
    });

    // Update workspace owner
    await prisma.workspace.update({
        where: { id: workspace.id },
        data: { ownerId: owner.id },
    });

    // Create workspace members
    await prisma.workspaceMember.createMany({
        data: [
            { workspaceId: workspace.id, userId: owner.id, role: 'owner' },
            { workspaceId: workspace.id, userId: lawyer1.id, role: 'partner' },
            { workspaceId: workspace.id, userId: lawyer2.id, role: 'lawyer' },
        ],
    });

    // Create clients
    const clients = await Promise.all([
        prisma.client.create({
            data: {
                workspaceId: workspace.id,
                name: 'Dangote Industries Ltd',
                email: 'legal@dangote.com',
                phone: '+234 803 123 4567',
                company: 'Dangote Industries',
                industry: 'Manufacturing',
                status: 'active',
            },
        }),
        prisma.client.create({
            data: {
                workspaceId: workspace.id,
                name: 'GTBank Plc',
                email: 'legal@gtbank.com',
                phone: '+234 802 234 5678',
                company: 'Guaranty Trust Bank',
                industry: 'Banking',
                status: 'active',
            },
        }),
        prisma.client.create({
            data: {
                workspaceId: workspace.id,
                name: 'Jumia Nigeria',
                email: 'legal@jumia.com.ng',
                phone: '+234 801 345 6789',
                company: 'Jumia',
                industry: 'E-commerce',
                status: 'active',
            },
        }),
        prisma.client.create({
            data: {
                workspaceId: workspace.id,
                name: 'Mr. Chukwuma Nwosu',
                email: 'cnwosu@email.com',
                phone: '+234 805 456 7890',
                status: 'active',
            },
        }),
    ]);

    // Create matters
    const matters = await Promise.all([
        prisma.matter.create({
            data: {
                workspaceId: workspace.id,
                caseNumber: 'SUIT/123/2024',
                name: 'Contract Dispute - Supply Agreement',
                clientId: clients[0].id,
                assignedLawyerId: lawyer1.id,
                court: 'Federal High Court Lagos',
                judge: 'Hon. Justice Adebayo',
                status: 'active',
                nextCourtDate: new Date('2024-12-15'),
            },
        }),
        prisma.matter.create({
            data: {
                workspaceId: workspace.id,
                caseNumber: 'SUIT/456/2024',
                name: 'Banking Litigation - Loan Recovery',
                clientId: clients[1].id,
                assignedLawyerId: owner.id,
                court: 'High Court of Lagos State',
                judge: 'Hon. Justice Okafor',
                status: 'active',
                nextCourtDate: new Date('2024-12-20'),
            },
        }),
        prisma.matter.create({
            data: {
                workspaceId: workspace.id,
                caseNumber: 'ADR/789/2024',
                name: 'E-commerce Dispute Resolution',
                clientId: clients[2].id,
                assignedLawyerId: lawyer2.id,
                status: 'pending',
            },
        }),
        prisma.matter.create({
            data: {
                workspaceId: workspace.id,
                caseNumber: 'SUIT/234/2024',
                name: 'Land Dispute - Property Rights',
                clientId: clients[3].id,
                assignedLawyerId: lawyer1.id,
                court: 'Lagos State High Court',
                status: 'active',
                nextCourtDate: new Date('2024-12-10'),
            },
        }),
    ]);

    // Create briefs
    await Promise.all([
        prisma.brief.create({
            data: {
                workspaceId: workspace.id,
                briefNumber: 'BR-001-2024',
                name: 'Statement of Claim - Contract Dispute',
                clientId: clients[0].id,
                matterId: matters[0].id,
                lawyerId: lawyer1.id,
                category: 'Litigation',
                status: 'active',
                dueDate: new Date('2024-12-05'),
                description: 'Initial statement of claim for contract dispute case',
            },
        }),
        prisma.brief.create({
            data: {
                workspaceId: workspace.id,
                briefNumber: 'BR-002-2024',
                name: 'Motion for Injunction',
                clientId: clients[1].id,
                matterId: matters[1].id,
                lawyerId: owner.id,
                category: 'Litigation',
                status: 'active',
                dueDate: new Date('2024-12-12'),
                description: 'Emergency motion for injunction',
            },
        }),
        prisma.brief.create({
            data: {
                workspaceId: workspace.id,
                briefNumber: 'BR-003-2024',
                name: 'Arbitration Brief',
                clientId: clients[2].id,
                matterId: matters[2].id,
                lawyerId: lawyer2.id,
                category: 'ADR',
                status: 'finalized',
                dueDate: new Date('2024-11-30'),
                description: 'Arbitration submission brief',
            },
        }),
    ]);

    // Create expenses
    await prisma.expense.createMany({
        data: [
            {
                workspaceId: workspace.id,
                category: 'Office Rent',
                amount: 500000000, // ₦5,000,000 in kobo
                description: 'Monthly office rent - December 2024',
                date: new Date('2024-12-01'),
                reference: 'RENT-DEC-2024',
            },
            {
                workspaceId: workspace.id,
                category: 'Staff Salary',
                amount: 1200000000, // ₦12,000,000 in kobo
                description: 'Staff salaries for December 2024',
                date: new Date('2024-12-01'),
                reference: 'SAL-DEC-2024',
            },
            {
                workspaceId: workspace.id,
                category: 'Costs of Filing Processes',
                amount: 15000000, // ₦150,000 in kobo
                description: 'Court filing fees - SUIT/123/2024',
                date: new Date('2024-11-28'),
                reference: 'FILING-001',
            },
            {
                workspaceId: workspace.id,
                category: 'Office Supplies',
                amount: 8500000, // ₦85,000 in kobo
                description: 'Stationery and office supplies',
                date: new Date('2024-11-25'),
                reference: 'SUPPLIES-NOV',
            },
            {
                workspaceId: workspace.id,
                category: 'Transportation',
                amount: 12000000, // ₦120,000 in kobo
                description: 'Transportation to court hearings',
                date: new Date('2024-11-27'),
            },
        ],
    });

    // Create invoices
    const invoice1 = await prisma.invoice.create({
        data: {
            invoiceNumber: 'INV-2024-001',
            clientId: clients[0].id,
            matterId: matters[0].id,
            date: new Date('2024-11-01'),
            dueDate: new Date('2024-12-01'),
            status: 'paid',
            billToName: 'Dangote Industries Ltd',
            billToAddress: '1 Dangote Drive',
            billToCity: 'Lagos',
            billToState: 'Lagos',
            attentionTo: 'Legal Department',
            subtotal: 500000000, // ₦5,000,000
            vatAmount: 37500000, // 7.5%
            securityChargeAmount: 5000000, // 1%
            totalAmount: 542500000,
        },
    });

    await prisma.invoiceItem.createMany({
        data: [
            {
                invoiceId: invoice1.id,
                description: 'Professional fee for contract dispute consultation',
                amount: 300000000,
                quantity: 1,
                order: 1,
            },
            {
                invoiceId: invoice1.id,
                description: 'Legal research and document preparation',
                amount: 200000000,
                quantity: 1,
                order: 2,
            },
        ],
    });

    await prisma.payment.create({
        data: {
            clientId: clients[0].id,
            invoiceId: invoice1.id,
            amount: 542500000,
            date: new Date('2024-11-15'),
            method: 'transfer',
            reference: 'TRF/DAN/001/2024',
        },
    });

    console.log('✅ Database seeded successfully!');
    console.log(`
    📊 Created:
    - 1 Workspace: ${workspace.name}
    - 3 Users (Owner + 2 Lawyers)
    - 4 Clients
    - 4 Matters
    - 3 Briefs
    - 5 Expenses
    - 1 Invoice with payment
    
    🔐 Login credentials:
    Email: adeyemi@ascolp.com
    Password: password123
    `);
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
