import { FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';

export function getGeminiTools(): FunctionDeclaration[] {
    return [
        {
            name: 'get_matters',
            description: 'Get matters (cases/briefs) for the workspace. Can filter by status, client name, or search term.',
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    status: { type: SchemaType.STRING, description: 'Filter by status: active, closed, archived' },
                    client_name: { type: SchemaType.STRING, description: 'Filter by client name (partial match)' },
                    search: { type: SchemaType.STRING, description: 'Search by matter title' },
                    limit: { type: SchemaType.NUMBER, description: 'Max results (default 20)' },
                },
            },
        },
        {
            name: 'get_matter_detail',
            description: 'Get full detail on a specific matter including recent court dates, documents, and invoices.',
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    matter_id: { type: SchemaType.STRING, description: 'The matter ID' },
                    title: { type: SchemaType.STRING, description: 'Search by matter title if ID unknown' },
                },
            },
        },
        {
            name: 'get_clients',
            description: 'Get clients for the workspace with matter and payment counts.',
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    search: { type: SchemaType.STRING, description: 'Search by client name' },
                    limit: { type: SchemaType.NUMBER, description: 'Max results (default 20)' },
                },
            },
        },
        {
            name: 'get_client_detail',
            description: 'Get full client profile: all matters, payment history, outstanding invoices.',
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    client_id: { type: SchemaType.STRING, description: 'The client ID' },
                    name: { type: SchemaType.STRING, description: 'Search by client name if ID unknown' },
                },
            },
        },
        {
            name: 'get_court_dates',
            description: 'Get upcoming or past court dates. Filter by date range, lawyer name, or matter title.',
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    upcoming: { type: SchemaType.BOOLEAN, description: 'True for future dates, false for past. Default true.' },
                    days: { type: SchemaType.NUMBER, description: 'Number of days ahead/behind to look (default 30)' },
                    lawyer_name: { type: SchemaType.STRING, description: 'Filter by appearing counsel name' },
                    matter_title: { type: SchemaType.STRING, description: 'Filter by matter title' },
                },
            },
        },
        {
            name: 'get_financials',
            description: 'Get financial summary: payments received, outstanding invoices, revenue breakdown.',
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    period: { type: SchemaType.STRING, description: 'this-month, last-month, this-quarter, this-year, all-time' },
                    client_name: { type: SchemaType.STRING, description: 'Filter to a specific client' },
                },
            },
        },
        {
            name: 'get_lawyer_activity',
            description: 'Get court appearance stats and workload breakdown for lawyers in the workspace.',
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    lawyer_name: { type: SchemaType.STRING, description: 'Filter to a specific lawyer (optional — omit for all)' },
                },
            },
        },
        {
            name: 'search_documents',
            description: 'Search for documents by name or matter title.',
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    search: { type: SchemaType.STRING, description: 'Search term for document name' },
                    matter_title: { type: SchemaType.STRING, description: 'Filter by matter title' },
                    limit: { type: SchemaType.NUMBER, description: 'Max results (default 10)' },
                },
            },
        },
        {
            name: 'analyse_document',
            description: 'Fetch a document from storage and analyse its contents — summarise, extract clauses, or answer a question about it.',
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    document_id: { type: SchemaType.STRING, description: 'The document ID from Reforma' },
                    question: { type: SchemaType.STRING, description: 'What to find or analyse in the document' },
                },
                required: ['document_id', 'question'],
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
                    ...(input.search && { name: { contains: input.search, mode: 'insensitive' } }),
                },
                select: {
                    id: true, name: true, status: true, court: true,
                    createdAt: true, updatedAt: true,
                    client: { select: { name: true } },
                    _count: { select: { calendarEntries: true, briefs: true } },
                },
                orderBy: { updatedAt: 'desc' },
                take: input.limit ?? 20,
            });
            return matters.map(m => ({
                id: m.id, title: m.name, status: m.status, court: m.court,
                client: m.client?.name, court_dates: m._count.calendarEntries,
                briefs: m._count.briefs, last_activity: m.updatedAt, opened: m.createdAt,
            }));
        }

        case 'get_matter_detail': {
            const matter = await prisma.matter.findFirst({
                where: input.matter_id
                    ? { id: input.matter_id, workspaceId }
                    : { name: { contains: input.title, mode: 'insensitive' }, workspaceId },
                include: {
                    client: { select: { name: true, email: true, phone: true } },
                    calendarEntries: {
                        orderBy: { date: 'desc' }, take: 10,
                        select: { date: true, court: true, proceedings: true, outcome: true, adjournedTo: true, appearances: { select: { name: true } } },
                    },
                    briefs: { take: 10, select: { id: true, name: true, createdAt: true } },
                    invoices: { select: { totalAmount: true, status: true, date: true } },
                },
            });
            if (!matter) return { error: 'Matter not found' };
            return matter;
        }

        case 'get_clients': {
            return prisma.client.findMany({
                where: {
                    workspaceId,
                    ...(input.search && { name: { contains: input.search, mode: 'insensitive' } }),
                },
                select: {
                    id: true, name: true, email: true, phone: true,
                    _count: { select: { matters: true, invoices: true, payments: true } },
                },
                orderBy: { name: 'asc' },
                take: input.limit ?? 20,
            });
        }

        case 'get_client_detail': {
            const client = await prisma.client.findFirst({
                where: input.client_id
                    ? { id: input.client_id, workspaceId }
                    : { name: { contains: input.name, mode: 'insensitive' }, workspaceId },
                include: {
                    matters: { select: { id: true, name: true, status: true, court: true }, orderBy: { createdAt: 'desc' } },
                    payments: { select: { amount: true, date: true, method: true, reference: true }, orderBy: { date: 'desc' }, take: 20 },
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
            return prisma.calendarEntry.findMany({
                where: {
                    type: 'COURT',
                    matter: { workspaceId },
                    date: input.upcoming !== false
                        ? { gte: now, lte: boundary }
                        : { gte: boundary, lte: now },
                    ...(input.lawyer_name && { appearances: { some: { name: { contains: input.lawyer_name, mode: 'insensitive' } } } }),
                    ...(input.matter_title && { matter: { workspaceId, name: { contains: input.matter_title, mode: 'insensitive' } } }),
                },
                orderBy: { date: input.upcoming !== false ? 'asc' : 'desc' },
                take: 30,
                select: {
                    date: true, court: true, proceedings: true, outcome: true, adjournedTo: true,
                    matter: { select: { name: true, client: { select: { name: true } } } },
                    appearances: { select: { name: true } },
                },
            });
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
                startDate = new Date(2000, 0, 1); endDate = new Date(2100, 0, 1);
            }
            const clientFilter = input.client_name
                ? { workspaceId, name: { contains: input.client_name, mode: 'insensitive' as const } }
                : { workspaceId };
            const [payments, invoices] = await Promise.all([
                prisma.payment.findMany({
                    where: { client: clientFilter, date: { gte: startDate, lte: endDate } },
                    select: { amount: true, date: true, client: { select: { name: true } } },
                }),
                prisma.invoice.findMany({
                    where: { client: clientFilter, date: { gte: startDate, lte: endDate } },
                    select: { totalAmount: true, status: true, client: { select: { name: true } } },
                }),
            ]);
            const totalReceived = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
            const outstanding = invoices
                .filter(i => !['paid', 'PAID'].includes((i.status || '').toLowerCase()))
                .reduce((s, i) => s + Number(i.totalAmount || 0), 0);
            return {
                period: input.period ?? 'this-month', total_received: totalReceived,
                outstanding, payment_count: payments.length,
                payments_by_client: Object.entries(
                    payments.reduce((acc: Record<string, number>, p) => {
                        const n = p.client?.name ?? 'Unknown';
                        acc[n] = (acc[n] || 0) + Number(p.amount || 0);
                        return acc;
                    }, {})
                ).sort((a, b) => b[1] - a[1]),
            };
        }

        case 'get_lawyer_activity': {
            const members = await prisma.workspaceMember.findMany({
                where: {
                    workspaceId,
                    ...(input.lawyer_name && { user: { name: { contains: input.lawyer_name, mode: 'insensitive' } } }),
                },
                include: { user: { select: { id: true, name: true } } },
            });
            const memberIds = members.map(m => m.userId);
            const now = new Date();
            const entries = await prisma.calendarEntry.findMany({
                where: {
                    type: 'COURT', date: { lte: now }, matter: { workspaceId },
                    appearances: { some: { id: { in: memberIds } } },
                },
                select: {
                    matterId: true, court: true, matter: { select: { court: true } },
                    appearances: { select: { id: true }, where: { id: { in: memberIds } } },
                },
            });
            const statsMap = new Map<string, { name: string; appearances: number; cases: Set<string>; courts: Set<string> }>();
            for (const m of members) statsMap.set(m.userId, { name: m.user.name || 'Unknown', appearances: 0, cases: new Set(), courts: new Set() });
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
            return prisma.document.findMany({
                where: {
                    matter: { workspaceId },
                    ...(input.search && { name: { contains: input.search, mode: 'insensitive' } }),
                    ...(input.matter_title && { matter: { workspaceId, name: { contains: input.matter_title, mode: 'insensitive' } } }),
                },
                select: { id: true, name: true, createdAt: true, matter: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
                take: input.limit ?? 10,
            });
        }

        case 'analyse_document': {
            const doc = await prisma.document.findFirst({
                where: { id: input.document_id, matter: { workspaceId } },
                select: { name: true, url: true },
            });
            if (!doc?.url) return { error: 'Document not found or has no file attached.' };

            const fileResponse = await fetch(doc.url);
            if (!fileResponse.ok) return { error: 'Could not retrieve document file.' };

            const buffer = await fileResponse.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const mimeType = (fileResponse.headers.get('content-type') || 'application/pdf') as any;

            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const innerModel = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!).getGenerativeModel({ model: 'gemini-2.0-flash' });

            const result = await innerModel.generateContent([
                { inlineData: { data: base64, mimeType } },
                input.question,
            ]);
            return { document_name: doc.name, analysis: result.response.text() };
        }

        default:
            return { error: `Unknown tool: ${name}` };
    }
}
