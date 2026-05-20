import { PrismaClient } from '@prisma/client';
import { calculateComplianceDueDate } from '../src/lib/compliance-utils';

const prisma = new PrismaClient();

const OBLIGATIONS = [
    // ═══════════════════════════════════════════════
    // FEDERAL — NBA / LEGAL PROFESSION
    // ═══════════════════════════════════════════════
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'NBA',
        nature: 'Bar Fees',
        actionRequired: 'Bar Practicing Fee (BPF)',
        procedure: 'Pay annual practicing fees for every lawyer in the firm via portal.nigerianbar.org.ng. Payment must be completed and Stamp & Seal activated before signing any court process. Non-payment disqualifies a lawyer from filing, signing pleadings, agreements, deeds, or legal opinions.',
        frequency: 'Annual',
        dueDateDescription: '31st March',
        feeDescription: '₦5,000 (0–4 yrs) | ₦10,000 (5–9 yrs) | ₦17,500 (10–14 yrs) | ₦25,000 (15+ yrs) | ₦50,000 (SAN/Bencher)',
        feeSchedule: { '0-4': 5000, '5-9': 10000, '10-14': 17500, '15+': 25000, 'SAN': 50000 },
        scope: 'per_lawyer',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'NBA Branch',
        nature: 'Bar Fees',
        actionRequired: 'NBA Branch Dues',
        procedure: 'Pay annual branch dues to each lawyer\'s registered NBA branch (Lagos, Ikeja, Abuja, etc.) concurrently with BPF. Required before Stamp & Seal can be obtained. Amounts are set independently by each branch — confirm via your branch portal or secretariat.',
        frequency: 'Annual',
        dueDateDescription: '31st March',
        feeDescription: 'Set per branch — confirm via branch portal (e.g., nbalagos.gigo360.com for Lagos)',
        feeSchedule: null,
        scope: 'per_lawyer',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'NBA',
        nature: 'Professional',
        actionRequired: 'NBA Digital Stamp & Seal Activation',
        procedure: 'Activate each lawyer\'s annual digital stamp and seal via estamp.nigerianbar.org.ng after payment of BPF and branch dues. The seal must appear on every court process, pleading, agreement, deed, and legal opinion prepared by each lawyer. Stamps expire March 31 each year.',
        frequency: 'Annual',
        dueDateDescription: '31st March',
        feeDescription: 'Digital entitlement included with BPF payment | Physical pack: ~₦4,000/96 stamps',
        feeSchedule: null,
        scope: 'per_lawyer',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'NBA-ICLE',
        nature: 'Professional Development',
        actionRequired: 'Mandatory Continuing Professional Development (MCPD)',
        procedure: 'Accumulate minimum 5 CPD credit hours per year per lawyer from NBA-ICLE-accredited programmes. Maintain CPD certificates for audit purposes. Non-compliance constitutes professional misconduct under RPC 2023 Rule 11. NBA AGC sessions carry credit hours.',
        frequency: 'Annual',
        dueDateDescription: '31st December',
        feeDescription: 'Varies per programme; some free; NBA AGC sessions carry CPD credit',
        feeSchedule: null,
        scope: 'per_lawyer',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'NBA',
        nature: 'Professional',
        actionRequired: 'NBA Fidelity Fund Contribution',
        procedure: 'Pay annual fidelity fund contribution via NBA secretariat. This fund protects clients against loss occasioned by dishonest conduct of legal practitioners. Confirm current rate with NBA National Secretariat before payment.',
        frequency: 'Annual',
        dueDateDescription: '31st March',
        feeDescription: 'Rate set by NBA — confirm with NBA National Secretariat',
        feeSchedule: null,
        scope: 'per_lawyer',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'NBA Sections',
        nature: 'Professional',
        actionRequired: 'NBA Section Dues',
        procedure: 'Pay annual section dues for each section membership held by lawyers in the firm (NBA-SBL, NBA-SLL, NBA-SPIDEL, NBA-SLP, NBA-YLF). Optional but confers CPD credit, networking, and professional standing benefits. Confirm amounts via each section\'s portal.',
        frequency: 'Annual',
        dueDateDescription: '31st March',
        feeDescription: 'NBA-SBL: ₦5,000–₦20,000 (graduated) | Other sections: confirm per section portal',
        feeSchedule: { 'NBA-SBL-0-4': 5000, 'NBA-SBL-5-9': 10000, 'NBA-SBL-10-14': 15000, 'NBA-SBL-15+': 20000 },
        scope: 'per_lawyer',
    },

    // ═══════════════════════════════════════════════
    // FEDERAL — SCUML / AML/CFT
    // ═══════════════════════════════════════════════
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'SCUML / EFCC',
        nature: 'AML/CFT',
        actionRequired: 'SCUML Registration',
        procedure: 'Register as a Designated Non-Financial Business and Profession (DNFBP) via scumlportal.efcc.gov.ng within 3 months of commencing legal services involving client funds, real estate conveyancing, company formation, or trust management. Registration is free. Keep registration certificate on file.',
        frequency: 'One-time',
        dueDateDescription: null,
        feeDescription: 'Free (official SCUML portal) | Third-party agents: ₦45,000–₦150,000',
        feeSchedule: null,
        scope: 'firm',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'SCUML / NBA-AMLC',
        nature: 'AML/CFT',
        actionRequired: 'AML/CFT Written Policy — Annual Review',
        procedure: 'Maintain and annually review the firm\'s written AML/CFT policy approved by senior management. Policy must cover: customer acceptance criteria, CDD/EDD standards, record-keeping procedures, STR/CTR filing processes, sanctions screening, staff training plan, and compliance officer responsibilities. NBA-AMLC conducts compliance examinations.',
        frequency: 'Annual',
        dueDateDescription: '31st December',
        feeDescription: 'Internal cost — legal/compliance professional review',
        feeSchedule: null,
        scope: 'firm',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'SCUML / NBA-AMLC',
        nature: 'AML/CFT',
        actionRequired: 'AML/CFT Compliance Officer Appointment',
        procedure: 'Ensure a designated AML/CFT Compliance Officer is formally appointed and documented at the firm. The officer must have direct access to senior management and authority to file STRs without approval. Confirm appointment details are current with SCUML registration records.',
        frequency: 'Annual',
        dueDateDescription: '31st December',
        feeDescription: 'No filing fee',
        feeSchedule: null,
        scope: 'firm',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'SCUML / NFIU',
        nature: 'AML/CFT',
        actionRequired: 'Cash Transaction Report (CTR) Compliance',
        procedure: 'File CTRs for all cash transactions exceeding ₦5,000,000 (individuals) or ₦10,000,000 (corporates) via the NFIU goAML portal within 7 days of the transaction. Designate a responsible officer. Maintain internal logs of all CTRs filed. Failure to file is a criminal offence under MLPPA 2022.',
        frequency: 'Ongoing',
        dueDateDescription: null,
        feeDescription: 'No filing fee | Criminal penalty for non-compliance under MLPPA 2022',
        feeSchedule: null,
        scope: 'firm',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'NFIU',
        nature: 'AML/CFT',
        actionRequired: 'Suspicious Transaction Report (STR) Compliance',
        procedure: 'File STRs for any transaction or client activity raising reasonable suspicion of money laundering, terrorism financing, or proliferation financing via the NFIU goAML portal. File promptly — no minimum threshold applies. Maintain strict tipping-off prohibition. Retain STR records for 5 years.',
        frequency: 'Ongoing',
        dueDateDescription: null,
        feeDescription: 'No filing fee | Criminal penalty for non-compliance or tipping-off',
        feeSchedule: null,
        scope: 'firm',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'SCUML / NBA-AMLC',
        nature: 'AML/CFT',
        actionRequired: 'AML/CFT Staff Training',
        procedure: 'Conduct annual AML/CFT training for all staff including lawyers, paralegals, and support staff. Training must cover: recognition of suspicious activity, CDD obligations, record-keeping, STR/CTR filing procedures, and sanctions screening. Maintain attendance records and training materials.',
        frequency: 'Annual',
        dueDateDescription: '31st December',
        feeDescription: 'Varies — in-house or accredited external provider',
        feeSchedule: null,
        scope: 'firm',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'SCUML / NBA-AMLC',
        nature: 'AML/CFT',
        actionRequired: 'Firm-level AML/CFT Risk Assessment',
        procedure: 'Conduct and document a formal firm-level risk assessment covering: practice area risks, client profile risks, geographic risks, and transaction/service delivery risks. Update assessment annually and whenever there is a material change in the firm\'s practice or client base. Use risk rating to calibrate CDD intensity.',
        frequency: 'Annual',
        dueDateDescription: '31st December',
        feeDescription: 'Internal cost — legal/risk management professional',
        feeSchedule: null,
        scope: 'firm',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'SCUML',
        nature: 'AML/CFT',
        actionRequired: 'SCUML Annual Compliance Report',
        procedure: 'Submit the annual AML/CFT compliance report to SCUML via the SCUML portal. Report must confirm compliance with all DNFBP obligations: policy maintenance, CDD procedures, record-keeping, staff training completion, STR/CTR filing activity, and compliance officer details.',
        frequency: 'Annual',
        dueDateDescription: '31st December',
        feeDescription: 'No filing fee',
        feeSchedule: null,
        scope: 'firm',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'SCUML / NBA-AMLC',
        nature: 'AML/CFT',
        actionRequired: 'AML/CFT Record-keeping Compliance',
        procedure: 'Confirm that all client identity documents, CDD/EDD records, transaction records, and AML/CFT correspondence are being retained for a minimum of 5 years from transaction date or end of business relationship. Records must be retrievable upon demand by SCUML, EFCC, or NFIU within 48 hours.',
        frequency: 'Annual',
        dueDateDescription: '31st December',
        feeDescription: 'Internal cost — document management and storage',
        feeSchedule: null,
        scope: 'firm',
    },

    // ═══════════════════════════════════════════════
    // FEDERAL — TAX
    // ═══════════════════════════════════════════════
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'FIRS',
        nature: 'Tax',
        actionRequired: 'Company Income Tax (CIT) Filing',
        procedure: 'File audited financial statements, tax computations, and self-assessment form with FIRS via TaxPro-Max (taxpro-max.firs.gov.ng). Legal/professional service firms cannot claim the small company 0% exemption regardless of turnover. File by June 30 for December year-end.',
        frequency: 'Annual',
        dueDateDescription: '30th June',
        feeDescription: '30% of assessable profits | Late filing: ₦25,000 (1st month) + ₦5,000/month | Late payment: 10% + CBN rate',
        feeSchedule: null,
        scope: 'firm',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'FIRS',
        nature: 'Tax',
        actionRequired: 'Development Levy',
        procedure: 'File development levy alongside CIT return via TaxPro-Max. From January 2026, this replaces the former Education Tax, IT Development Levy, NASENI Levy, and PTF Levy as a single consolidated 4% levy on assessable profits. Does not apply to qualifying small companies — but professional service firms are excluded from small company status.',
        frequency: 'Annual',
        dueDateDescription: '30th June',
        feeDescription: '4% of assessable profits (effective January 2026 under Nigeria Tax Act 2025)',
        feeSchedule: null,
        scope: 'firm',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'FIRS',
        nature: 'Tax',
        actionRequired: 'Value Added Tax (VAT) Filing',
        procedure: 'File monthly VAT returns via FIRS TaxPro-Max by the 21st of the following month. Legal services are taxable supplies at 7.5%. Nil returns must be filed in zero-transaction months. Registration threshold: ₦25M annual turnover (₦50M from January 2026 under NTA 2025).',
        frequency: 'Monthly',
        dueDateDescription: '21st of every month',
        feeDescription: '7.5% of taxable services | Nil returns: no payment but filing still required',
        feeSchedule: null,
        scope: 'firm',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'FIRS',
        nature: 'Tax',
        actionRequired: 'Withholding Tax (WHT) Remittance',
        procedure: 'Deduct WHT from payments made to subcontractors and professional service providers, and remit via TaxPro-Max by the 21st of the following month. Issue WHT credit certificates to payees. Under Withholding Regulations 2024 (effective January 2025): 5% rate on payments to resident companies and individuals for professional/management fees.',
        frequency: 'Monthly',
        dueDateDescription: '21st of every month',
        feeDescription: '5% (resident companies & individuals) | 10% (non-residents) | Penalty: 10% of undeducted amount',
        feeSchedule: null,
        scope: 'firm',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'FIRS',
        nature: 'Tax',
        actionRequired: 'FIRS TIN Registration',
        procedure: 'Register for a Tax Identification Number (TIN) with FIRS via TaxPro-Max. Required before commencing business operations or opening a corporate bank account. All tax filings, payments, and correspondence must reference the firm\'s TIN.',
        frequency: 'One-time',
        dueDateDescription: null,
        feeDescription: 'Free registration',
        feeSchedule: null,
        scope: 'firm',
    },

    // ═══════════════════════════════════════════════
    // FEDERAL — CORPORATE & STATUTORY
    // ═══════════════════════════════════════════════
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'CAC',
        nature: 'Corporate',
        actionRequired: 'CAC Annual Returns',
        procedure: 'File annual returns with the Corporate Affairs Commission via the CAC portal within 42 days of the firm\'s Annual General Meeting (or by June 30 for December year-end entities). Persistent default can result in striking off (deregistration) of the company. Update beneficial ownership register simultaneously.',
        frequency: 'Annual',
        dueDateDescription: '30th June',
        feeDescription: '₦5,000–₦10,000 filing fee | Penalty: ₦5,000/year default + ₦1,000/officer/year',
        feeSchedule: null,
        scope: 'firm',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'PenCom',
        nature: 'Pension',
        actionRequired: 'Pension Remittance',
        procedure: 'Remit employer (10%) and employee (8%) pension contributions to each employee\'s Retirement Savings Account with their chosen Pension Fund Administrator (PFA) every month. Obtain Employer Code from PenCom via a PFA before first remittance. Mandatory for firms with 3 or more employees.',
        frequency: 'Monthly',
        dueDateDescription: '7 days after salary payment',
        feeDescription: 'Employer: 10% of monthly emolument | Employee: 8% of monthly emolument',
        feeSchedule: { employer_rate: 0.10, employee_rate: 0.08 },
        scope: 'firm',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'NSITF',
        nature: 'Levy',
        actionRequired: 'NSITF Employee Compensation Contribution',
        procedure: 'Remit 1% of the firm\'s total monthly payroll to NSITF (Employee Compensation Scheme) by the 16th of the following month. This is an employer-only contribution — no employee deduction. Covers work-related injuries, occupational diseases, and death benefits for all staff.',
        frequency: 'Monthly',
        dueDateDescription: '16th of every month',
        feeDescription: '1% of total monthly payroll (employer only) | Penalty: 10% late fee + up to ₦1M corporate fine',
        feeSchedule: { rate: 0.01 },
        scope: 'firm',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'ITF',
        nature: 'Levy',
        actionRequired: 'ITF Annual Training Levy',
        procedure: 'Pay 1% of total annual payroll (all emoluments and allowances) to the Industrial Training Fund by April 1. Applies if the firm has 5 or more employees or annual turnover of ₦50 million+. Submit approved training plan to ITF at start of financial year. ITF compliance certificate required for government procurement bids.',
        frequency: 'Annual',
        dueDateDescription: '1st April',
        feeDescription: '1% of total annual payroll | Penalty: 5% monthly interest on outstanding levy',
        feeSchedule: { rate: 0.01 },
        scope: 'firm',
    },
    {
        tier: 'Federal', jurisdiction: 'Federal',
        regulatoryBody: 'BPP',
        nature: 'Procurement',
        actionRequired: 'BPP Vendor Registration',
        procedure: 'Register as a vendor with the Bureau of Public Procurement (bpp.gov.ng) to participate in federal government procurement processes. Annual renewal of compliance certificates required: Tax Clearance Certificate (FIRS), NSITF compliance certificate, ITF certificate, PenCom pension compliance certificate, and audited accounts.',
        frequency: 'Annual',
        dueDateDescription: '31st March',
        feeDescription: 'Free registration | Prerequisite certificates: FIRS TCC, NSITF cert, ITF cert, PenCom cert',
        feeSchedule: null,
        scope: 'firm',
    },

    // ═══════════════════════════════════════════════
    // STATE (LAGOS)
    // ═══════════════════════════════════════════════
    {
        tier: 'State', jurisdiction: 'Lagos',
        regulatoryBody: 'LIRS',
        nature: 'Tax',
        actionRequired: 'PAYE Monthly Remittance',
        procedure: 'Deduct Pay-As-You-Earn (PAYE) from employee salaries monthly and remit to the Lagos Internal Revenue Service via etax.lirs.net by the 10th of the following month. Employees earning at or below the national minimum wage (₦70,000/month) are exempt from PAYE deductions.',
        frequency: 'Monthly',
        dueDateDescription: '10th of every month',
        feeDescription: 'Graduated PITA bands | Penalty: 10% annual charge + CBN interest on outstanding',
        feeSchedule: null,
        scope: 'firm',
    },
    {
        tier: 'State', jurisdiction: 'Lagos',
        regulatoryBody: 'LIRS',
        nature: 'Tax',
        actionRequired: 'Annual Employer PAYE Returns',
        procedure: 'File the annual employer PAYE returns with LIRS by January 31, covering all employees\' income and PAYE deductions for the preceding calendar year. Submit electronically via etax.lirs.net. Individual employee annual tax returns are due separately by March 31 (or April 14 when LIRS extends).',
        frequency: 'Annual',
        dueDateDescription: '31st January',
        feeDescription: 'No filing fee | Late filing penalty: ₦100,000 (1st month) + ₦50,000/month',
        feeSchedule: null,
        scope: 'firm',
    },
    {
        tier: 'State', jurisdiction: 'Lagos',
        regulatoryBody: 'LIRS',
        nature: 'Tax',
        actionRequired: 'Business Premises Levy',
        procedure: 'Pay the annual business premises levy to LIRS for each premises operated in Lagos State. Covers the right to operate a commercial enterprise within Lagos jurisdiction. Typically processed alongside tax clearance certificate application. Confirm current rate with LIRS.',
        frequency: 'Annual',
        dueDateDescription: '31st March',
        feeDescription: 'Varies by premises type and location — confirm with LIRS',
        feeSchedule: null,
        scope: 'firm',
    },
    {
        tier: 'State', jurisdiction: 'Lagos',
        regulatoryBody: 'LIRS',
        nature: 'Tax',
        actionRequired: 'Direct Assessment — Self-employed Partners',
        procedure: 'Equity and managing partners not on PAYE must file personal income tax returns by March 31 (extended to April 14 in some years). Applicable to all self-employed lawyers and directors drawing income other than salary. File via etax.lirs.net.',
        frequency: 'Annual',
        dueDateDescription: '31st March',
        feeDescription: 'Graduated PITA bands on personal income | Penalty: 10% annual charge + CBN interest',
        feeSchedule: null,
        scope: 'per_lawyer',
    },
    {
        tier: 'State', jurisdiction: 'Lagos',
        regulatoryBody: 'LIRS',
        nature: 'Tax',
        actionRequired: 'State Withholding Tax (WHT) Remittance',
        procedure: 'Deduct and remit state-level WHT on payments to individuals domiciled in Lagos (e.g., freelance consultants, individual service providers) by the 21st of the following month via the LIRS portal. Separate from FIRS WHT which covers payments to corporate entities.',
        frequency: 'Monthly',
        dueDateDescription: '21st of every month',
        feeDescription: '10% on payments to Lagos-resident individuals',
        feeSchedule: null,
        scope: 'firm',
    },
    {
        tier: 'State', jurisdiction: 'Lagos',
        regulatoryBody: 'FIRS / LIRS',
        nature: 'Tax',
        actionRequired: 'Stamp Duty on Instruments',
        procedure: 'Ensure all chargeable instruments (deeds, leases, mortgages, contracts, POAs) are stamped within 30 days of execution. As drafting lawyers, the firm has a professional and legal obligation to arrange stamping. Unstamped instruments are inadmissible as evidence in court. From NTA 2025, electronic documents are expressly chargeable.',
        frequency: 'Per transaction',
        dueDateDescription: null,
        feeDescription: 'Deeds/conveyances: 1.5% | Leases: 6% of annual rent | Mortgages: 0.375% | Contracts: 1% | POA: ₦500 flat',
        feeSchedule: { deed: 0.015, lease: 0.06, mortgage: 0.00375, contract: 0.01, POA: 500 },
        scope: 'firm',
    },

    // ═══════════════════════════════════════════════
    // LOCAL
    // ═══════════════════════════════════════════════
    {
        tier: 'Local', jurisdiction: 'Local Government Area',
        regulatoryBody: 'LGA',
        nature: 'Business Registration',
        actionRequired: 'LGA Business Permit',
        procedure: 'Obtain and renew the annual business permit / operating licence from the Local Government Area where the firm\'s principal office is located. Required for all commercial premises in most Nigerian LGAs. Obtain from LGA secretariat or state agency portal.',
        frequency: 'Annual',
        dueDateDescription: '31st March',
        feeDescription: 'Varies by LGA — typically ₦10,000–₦50,000',
        feeSchedule: null,
        scope: 'firm',
    },
    {
        tier: 'Local', jurisdiction: 'Local Government Area',
        regulatoryBody: 'LGA / LASAA',
        nature: 'Levy',
        actionRequired: 'Signage / Tenement Rate',
        procedure: 'Pay annual tenement rate for firm premises and signage levy for all external signs and advertising boards. In Lagos, all outdoor advertising is regulated by LASAA (Lagos State Signage and Advertisement Agency). Obtain LASAA approval and payment receipt for every sign installed or renewed.',
        frequency: 'Annual',
        dueDateDescription: '31st March',
        feeDescription: 'Varies by sign type, dimensions, and location — confirm with LASAA / LGA',
        feeSchedule: null,
        scope: 'firm',
    },

    // ═══════════════════════════════════════════════
    // INTERNATIONAL / CROSS-CUTTING
    // ═══════════════════════════════════════════════
    {
        tier: 'International', jurisdiction: 'Federal',
        regulatoryBody: 'NDPC',
        nature: 'Data Protection',
        actionRequired: 'NDPC Annual Data Protection Audit',
        procedure: 'Conduct and file the annual data protection compliance audit with the Nigeria Data Protection Commission under the Nigeria Data Protection Act 2023. Law firms process sensitive personal data (client identities, financial details, case records) and are subject to NDPA 2023. Appoint a Data Protection Officer, publish a privacy notice, and conduct DPIAs for high-risk processing activities.',
        frequency: 'Annual',
        dueDateDescription: '31st December',
        feeDescription: 'NDPC filing fee varies | External DPO/audit provider: ₦150,000–₦500,000+',
        feeSchedule: null,
        scope: 'firm',
    },
    {
        tier: 'International', jurisdiction: 'Federal',
        regulatoryBody: 'NBA / AGF',
        nature: 'Professional',
        actionRequired: 'Legal Practitioners Remuneration Order — Engagement Letter Compliance',
        procedure: 'Issue a written terms of engagement letter to every client within 14 days of receiving instructions. Letter must reflect minimum fees prescribed in the Legal Practitioners Remuneration Order 2023 (Scale 1–5 fees, Band 3 for Lagos/FCT). Apply to NBA Remuneration Committee within 2 days if charging below minimum or within 7 days to offer pro bono services.',
        frequency: 'Per retainer',
        dueDateDescription: null,
        feeDescription: 'Minimum fees set by LPRO 2023 — varies by service type, court, and years PQE | Band 3 (Lagos/FCT): highest rates',
        feeSchedule: null,
        scope: 'firm',
    },
];

async function main() {
    console.log('🌱 Starting Compliance Seeding...');
    console.log('🗑️  Clearing existing compliance data...');

    await prisma.complianceHistory.deleteMany({});
    await prisma.complianceTask.deleteMany({});
    await prisma.complianceObligation.deleteMany({});

    console.log('✅ Cleared existing data.');
    console.log('📝 Seeding obligations...');

    for (const obligation of OBLIGATIONS) {
        await prisma.complianceObligation.create({ data: obligation as any });
    }

    console.log(`✅ Seeded ${OBLIGATIONS.length} obligations.`);

    const workspaces = await prisma.workspace.findMany();
    const obligations = await prisma.complianceObligation.findMany();

    console.log(`🔗 Assigning obligations to ${workspaces.length} workspace(s)...`);

    for (const workspace of workspaces) {
        const members = await prisma.workspaceMember.findMany({ where: { workspaceId: workspace.id } });

        for (const obl of obligations) {
            const dueDate = calculateComplianceDueDate(obl.dueDateDescription || '');

            const task = await prisma.complianceTask.create({
                data: {
                    workspaceId: workspace.id,
                    obligationId: obl.id,
                    status: 'pending',
                    dueDate,
                    period: '2025/2026 Cycle',
                }
            });

            if (dueDate) {
                const scheduledFor = new Date(dueDate);
                scheduledFor.setDate(scheduledFor.getDate() - 7);
                scheduledFor.setHours(9, 0, 0, 0);

                if (scheduledFor > new Date()) {
                    for (const member of members) {
                        await prisma.scheduledNotification.create({
                            data: {
                                complianceTaskId: task.id,
                                recipientId: member.userId,
                                notificationType: 'compliance_reminder',
                                scheduledFor,
                                status: 'pending',
                            }
                        });
                    }
                }
            }
        }
    }

    console.log(`✅ Compliance seeding complete — ${OBLIGATIONS.length} obligations across ${workspaces.length} workspace(s).`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
