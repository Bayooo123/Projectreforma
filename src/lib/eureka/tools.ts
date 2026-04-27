import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { del, head } from '@vercel/blob';

export function getTools(): Anthropic.Tool[] {
    return [
        {
            name: 'get_matters',
            description: 'Get matters (cases/briefs) for the workspace. Can filter by status, client, or search by title.',
            input_schema: {
                type: 'object',
                properties: {
                    status: { type: 'string', description: 'Filter by status: active, closed, archived' },
                    client_name: { type: 'string', description: 'Filter by client name (partial match)' },
                    search: { type: 'string', description: 'Search by matter title or description' },
                    limit: { type: 'number', description: 'Max results to return (default 20)' },
                },
            },
        },
        {
            name: 'get_matter_detail',
            description: 'Get full detail on a specific matter including court dates, documents, and activity.',
            input_schema: {
                type: 'object',
                properties: {
                    matter_id: { type: 'string', description: 'The matter ID' },
                    title: { type: 'string', description: 'Search by matter title if ID is unknown' },
                },
            },
        },
        {
            name: 'get_clients',
            description: 'Get clients for the workspace with their matter count and financial summary.',
            input_schema: {
                type: 'object',
                properties: {
                    search: { type: 'string', description: 'Search by client name' },
                    limit: { type: 'number', description: 'Max results (default 20)' },
                },
            },
        },
        {
            name: 'get_client_detail',
            description: 'Get full client profile: all matters, payment history, outstanding invoices.',
            input_schema: {
                type: 'object',
                properties: {
                    client_id: { type: 'string', description: 'The client ID' },
                    name: { type: 'string', description: 'Search by client name if ID unknown' },
                },
            },
        },
        {
            name: 'get_court_dates',
            description: 'Get upcoming or past court dates. Can filter by date range, lawyer, or matter.',
            input_schema: {
                type: 'object',
                properties: {
                    upcoming: { type: 'boolean', description: 'True for future dates, false for past' },
                    days: { type: 'number', description: 'Number of days ahead/behind to look (default 30)' },
                    lawyer_name: { type: 'string', description: 'Filter by appearing counsel name' },
                    matter_title: { type: 'string', description: 'Filter by matter title' },
                },
            },
        },
        {
            name: 'get_financials',
            description: 'Get financial summary: payments received, outstanding invoices, and revenue by period.',
            input_schema: {
                type: 'object',
                properties: {
                    period: { type: 'string', description: 'this-month, last-month, this-quarter, this-year, all-time' },
                    client_name: { type: 'string', description: 'Filter by client name' },
                },
            },
        },
        {
            name: 'get_lawyer_activity',
            description: 'Get court appearance stats and workload for lawyers in the workspace.',
            input_schema: {
                type: 'object',
                properties: {
                    lawyer_name: { type: 'string', description: 'Filter to a specific lawyer (optional)' },
                },
            },
        },
        {
            name: 'analyse_document',
            description: 'Fetch a document from storage and analyse its contents. Use for summarisation, clause extraction, or answering questions about a specific document.',
            input_schema: {
                type: 'object',
                properties: {
                    document_id: { type: 'string', description: 'The document ID from Reforma' },
                    question: { type: 'string', description: 'What to find or analyse in the document' },
                },
                required: ['document_id', 'question'],
            },
        },
        {
            name: 'search_documents',
            description: 'Search for documents by name or matter.',
            input_schema: {
                type: 'object',
                properties: {
                    search: { type: 'string', description: 'Search term for document name' },
                    matter_title: { type: 'string', description: 'Filter by matter title' },
                    limit: { type: 'number', description: 'Max results (default 10)' },
                },
            },
        },
    ];
}

export async function executeTool(
    name: string,
    input: Record<string, any>,
    workspaceId: string
): Promise<unknown> {
    switch (name) {
        case 'get_matters': {
            const matters = await prisma.matter.findMany({
                where: {
                    workspaceId,
                    ...(input.status && { status: input.status }),
                    ...(input.client_name && { client: { name: { contains: input.client_name, mode: 'insensitive' } } }),
                    ...(input.search && { title: { contains: input.search, mode: 'insensitive' } }),
                },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    court: true,
                    createdAt: true,
                    updatedAt: true,
                    client: { select: { name: true } },
                    _count: { select: { calendarEntries: true, documents: true } },
                },
                orderBy: { updatedAt: 'desc' },
                take: input.limit ?? 20,
            });
            return matters.map(m => ({
                id: m.id,
                title: m.title,
                status: m.status,
                court: m.court,
                client: m.client?.name,
                court_dates: m._count.calendarEntries,
                documents: m._count.documents,
                last_activity: m.updatedAt,
                opened: m.createdAt,
            }));
        }

        case 'get_matter_detail': {
            const where = input.matter_id
                ? { id: input.matter_id }
                : { title: { contains: input.title, mode: 'insensitive' as const }, workspaceId };

            const matter = await prisma.matter.findFirst({
                where: input.matter_id ? { id: input.matter_id, workspaceId } : { title: { contains: input.title, mode: 'insensitive' }, workspaceId },
                include: {
                    client: { select: { name: true, email: true, phone: true } },
                    calendarEntries: {
                        orderBy: { date: 'desc' },
                        take: 10,
                        select: { date: true, court: true, proceedings: true, outcome: true, adjournedTo: true, appearances: { select: { name: true } } },
                    },
                    documents: {
                        take: 10,
                        select: { id: true, name: true, createdAt: true, url: true },
                    },
                    invoices: {
                        select: { totalAmount: true, status: true, date: true },
                    },
                },
            });

            if (!matter) return { error: 'Matter not found' };

            return {
                id: matter.id,
                title: matter.title,
                status: matter.status,
                court: matter.court,
                client: matter.client,
                recent_court_dates: matter.calendarEntries,
                documents: matter.documents,
                invoices: matter.invoices,
            };
        }

        case 'get_clients': {
            const clients = await prisma.client.findMany({
                where: {
                    workspaceId,
                    ...(input.search && { name: { contains: input.search, mode: 'insensitive' } }),
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    _count: { select: { matters: true, invoices: true, payments: true } },
                },
                orderBy: { name: 'asc' },
                take: input.limit ?? 20,
            });
            return clients;
        }

        case 'get_client_detail': {
            const client = await prisma.client.findFirst({
                where: input.client_id
                    ? { id: input.client_id, workspaceId }
                    : { name: { contains: input.name, mode: 'insensitive' }, workspaceId },
                include: {
                    matters: { select: { id: true, title: true, status: true, court: true }, orderBy: { createdAt: 'desc' } },
                    payments: { select: { amount: true, date: true, description: true }, orderBy: { date: 'desc' }, take: 20 },
                    invoices: { select: { totalAmount: true, status: true, date: true }, orderBy: { date: 'desc' }, take: 20 },
                },
            });

            if (!client) return { error: 'Client not found' };

            const totalPaid = client.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
            const outstanding = client.invoices
                .filter(i => !['paid', 'PAID'].includes((i.status || '').toLowerCase()))
                .reduce((s, i) => s + Number(i.totalAmount || 0), 0);

            return { ...client, total_paid: totalPaid, outstanding };
        }

        case 'get_court_dates': {
            const now = new Date();
            const days = input.days ?? 30;
            const boundary = new Date(now);
            boundary.setDate(now.getDate() + (input.upcoming !== false ? days : -days));

            const entries = await prisma.calendarEntry.findMany({
                where: {
                    type: 'COURT',
                    matter: { workspaceId },
                    date: input.upcoming !== false
                        ? { gte: now, lte: boundary }
                        : { gte: boundary, lte: now },
                    ...(input.lawyer_name && {
                        appearances: { some: { name: { contains: input.lawyer_name, mode: 'insensitive' } } },
                    }),
                    ...(input.matter_title && {
                        matter: { workspaceId, title: { contains: input.matter_title, mode: 'insensitive' } },
                    }),
                },
                orderBy: { date: input.upcoming !== false ? 'asc' : 'desc' },
                take: 30,
                select: {
                    date: true,
                    court: true,
                    proceedings: true,
                    outcome: true,
                    adjournedTo: true,
                    matter: { select: { title: true, client: { select: { name: true } } } },
                    appearances: { select: { name: true } },
                },
            });
            return entries;
        }

        case 'get_financials': {
            const now = new Date();
            let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

            if (input.period === 'last-month') {
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            } else if (input.period === 'this-quarter') {
                const q = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), q * 3, 1);
                endDate = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59);
            } else if (input.period === 'this-year') {
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
            } else if (input.period === 'all-time') {
                startDate = new Date(2000, 0, 1);
                endDate = new Date(2100, 0, 1);
            }

            const [payments, invoices] = await Promise.all([
                prisma.payment.findMany({
                    where: {
                        client: {
                            workspaceId,
                            ...(input.client_name && { name: { contains: input.client_name, mode: 'insensitive' } }),
                        },
                        date: { gte: startDate, lte: endDate },
                    },
                    select: { amount: true, date: true, client: { select: { name: true } } },
                }),
                prisma.invoice.findMany({
                    where: {
                        client: {
                            workspaceId,
                            ...(input.client_name && { name: { contains: input.client_name, mode: 'insensitive' } }),
                        },
                        date: { gte: startDate, lte: endDate },
                    },
                    select: { totalAmount: true, status: true, client: { select: { name: true } } },
                }),
            ]);

            const totalReceived = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
            const outstanding = invoices
                .filter(i => !['paid', 'PAID'].includes((i.status || '').toLowerCase()))
                .reduce((s, i) => s + Number(i.totalAmount || 0), 0);

            return {
                period: input.period ?? 'this-month',
                total_received: totalReceived,
                outstanding,
                payment_count: payments.length,
                payments_by_client: Object.entries(
                    payments.reduce((acc: Record<string, number>, p) => {
                        const name = p.client?.name ?? 'Unknown';
                        acc[name] = (acc[name] || 0) + Number(p.amount || 0);
                        return acc;
                    }, {})
                ).sort((a, b) => b[1] - a[1]),
            };
        }

        case 'get_lawyer_activity': {
            const members = await prisma.workspaceMember.findMany({
                where: {
                    workspaceId,
                    ...(input.lawyer_name && {
                        user: { name: { contains: input.lawyer_name, mode: 'insensitive' } },
                    }),
                },
                include: { user: { select: { id: true, name: true } } },
            });

            const memberIds = members.map(m => m.userId);
            const now = new Date();

            const entries = await prisma.calendarEntry.findMany({
                where: {
                    type: 'COURT',
                    date: { lte: now },
                    matter: { workspaceId },
                    appearances: { some: { id: { in: memberIds } } },
                },
                select: {
                    matterId: true,
                    court: true,
                    matter: { select: { court: true } },
                    appearances: { select: { id: true }, where: { id: { in: memberIds } } },
                },
            });

            const statsMap = new Map<string, { name: string; appearances: number; cases: Set<string>; courts: Set<string> }>();
            for (const m of members) {
                statsMap.set(m.userId, { name: m.user.name || 'Unknown', appearances: 0, cases: new Set(), courts: new Set() });
            }
            for (const entry of entries) {
                const court = entry.court || entry.matter?.court || null;
                for (const user of entry.appearances) {
                    const s = statsMap.get(user.id);
                    if (!s) continue;
                    s.appearances++;
                    if (entry.matterId) s.cases.add(entry.matterId);
                    if (court) s.courts.add(court);
                }
            }

            return Array.from(statsMap.values())
                .map(s => ({ name: s.name, appearances: s.appearances, cases: s.cases.size, distinct_courts: s.courts.size }))
                .sort((a, b) => b.appearances - a.appearances);
        }

        case 'search_documents': {
            const docs = await prisma.document.findMany({
                where: {
                    matter: { workspaceId },
                    ...(input.search && { name: { contains: input.search, mode: 'insensitive' } }),
                    ...(input.matter_title && { matter: { workspaceId, title: { contains: input.matter_title, mode: 'insensitive' } } }),
                },
                select: {
                    id: true,
                    name: true,
                    url: true,
                    createdAt: true,
                    matter: { select: { title: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: input.limit ?? 10,
            });
            return docs;
        }

        case 'analyse_document': {
            const doc = await prisma.document.findFirst({
                where: { id: input.document_id, matter: { workspaceId } },
                select: { name: true, url: true },
            });

            if (!doc?.url) return { error: 'Document not found or has no file attached.' };

            // Fetch the file from Vercel Blob
            const fileResponse = await fetch(doc.url);
            if (!fileResponse.ok) return { error: 'Could not retrieve document file.' };

            const buffer = await fileResponse.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const contentType = fileResponse.headers.get('content-type') || 'application/pdf';

            // Use Claude to analyse the document
            const Anthropic = (await import('@anthropic-ai/sdk')).default;
            const innerClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

            const analysis = await innerClient.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 2048,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'document',
                            source: { type: 'base64', media_type: contentType as any, data: base64 },
                        },
                        { type: 'text', text: input.question },
                    ],
                }],
            });

            const text = analysis.content.find(b => b.type === 'text');
            return {
                document_name: doc.name,
                analysis: text?.type === 'text' ? text.text : 'No analysis returned.',
            };
        }

        default:
            return { error: `Unknown tool: ${name}` };
    }
}
