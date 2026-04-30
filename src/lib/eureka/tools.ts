import { prisma } from '@/lib/prisma';

type Prop = { type: string; description?: string };

function tool(name: string, description: string, properties: Record<string, Prop>, required?: string[]) {
    return {
        name,
        description,
        input_schema: {
            type: 'object' as const,
            properties,
            ...(required && { required }),
        },
    };
}

export function getClaudeTools() {
    return [
        tool('get_matters', 'Get matters (cases/briefs) for the workspace. Can filter by status, client name, or search term.', {
            status: { type: 'string', description: 'Filter by status: active, closed, archived' },
            client_name: { type: 'string', description: 'Filter by client name (partial match)' },
            search: { type: 'string', description: 'Search by matter title' },
            limit: { type: 'number', description: 'Max results (default 20)' },
        }),
        tool('get_matter_detail', 'Get full detail on a specific matter including recent court dates, documents, and invoices.', {
            matter_id: { type: 'string', description: 'The matter ID' },
            title: { type: 'string', description: 'Search by matter title if ID unknown' },
        }),
        tool('get_clients', 'Get clients for the workspace with matter and payment counts.', {
            search: { type: 'string', description: 'Search by client name' },
            limit: { type: 'number', description: 'Max results (default 20)' },
        }),
        tool('get_client_detail', 'Get full client profile: all matters, payment history, outstanding invoices.', {
            client_id: { type: 'string', description: 'The client ID' },
            name: { type: 'string', description: 'Search by client name if ID unknown' },
        }),
        tool('get_court_dates', 'Get upcoming or past court dates. Filter by date range, lawyer name, or matter title.', {
            upcoming: { type: 'boolean', description: 'True for future dates, false for past. Default true.' },
            days: { type: 'number', description: 'Number of days ahead/behind to look (default 30)' },
            lawyer_name: { type: 'string', description: 'Filter by appearing counsel name' },
            matter_title: { type: 'string', description: 'Filter by matter title' },
        }),
        tool('get_financials', 'Get financial summary: payments received, outstanding invoices, revenue breakdown.', {
            period: { type: 'string', description: 'this-month, last-month, this-quarter, this-year, all-time' },
            client_name: { type: 'string', description: 'Filter to a specific client' },
        }),
        tool('get_lawyer_activity', 'Get court appearance stats and workload breakdown for lawyers in the workspace.', {
            lawyer_name: { type: 'string', description: 'Filter to a specific lawyer (optional — omit for all)' },
        }),
        tool('search_documents', 'Search for documents by name or matter title.', {
            search: { type: 'string', description: 'Search term for document name' },
            matter_title: { type: 'string', description: 'Filter by matter title' },
            limit: { type: 'number', description: 'Max results (default 10)' },
        }),
        tool('analyse_document', 'Fetch a document from storage and analyse its contents — summarise, extract clauses, or answer a question about it.', {
            document_id: { type: 'string', description: 'The document ID from Reforma' },
            question: { type: 'string', description: 'What to find or analyse in the document' },
        }, ['document_id', 'question']),
        tool('create_client', 'Create a new client in the workspace.', {
            name: { type: 'string', description: 'Full client name' },
            email: { type: 'string', description: 'Client email address' },
            phone: { type: 'string', description: 'Phone number (optional)' },
            company: { type: 'string', description: 'Company or organisation name (optional)' },
        }, ['name', 'email']),
        tool('create_matter', 'Create a new matter (case) in the workspace.', {
            name: { type: 'string', description: 'Matter/case title' },
            client_name: { type: 'string', description: 'Client name to link (optional)' },
            court: { type: 'string', description: 'Court name (optional)' },
            status: { type: 'string', description: 'active, closed, or archived (default active)' },
        }, ['name']),
        tool('create_brief', 'Create a new brief, optionally linked to a matter and client.', {
            name: { type: 'string', description: 'Brief title' },
            category: { type: 'string', description: 'e.g. litigation, advisory, corporate, property' },
            matter_title: { type: 'string', description: 'Matter title to link (optional)' },
            client_name: { type: 'string', description: 'Client name to link (optional)' },
            due_date: { type: 'string', description: 'Due date in ISO format e.g. 2025-07-01 (optional)' },
            description: { type: 'string', description: 'Brief description (optional)' },
        }, ['name', 'category']),
        tool('create_court_date', 'Schedule a new court date or hearing for a matter.', {
            matter_title: { type: 'string', description: 'Matter title to link the court date to' },
            date: { type: 'string', description: 'Date and time in ISO format e.g. 2025-07-15T09:00:00' },
            court: { type: 'string', description: 'Court name (optional)' },
            proceedings: { type: 'string', description: 'What the hearing is for e.g. Cross-examination (optional)' },
            type: { type: 'string', description: 'COURT or MEETING (default COURT)' },
        }, ['matter_title', 'date']),
        tool('get_inactive_matters', 'Find active matters with no recent activity — useful for spotting neglected cases.', {
            days: { type: 'number', description: 'Inactivity threshold in days (default 30)' },
        }),
        tool('get_overdue_invoices', 'Find invoices that are unpaid and past their due date.', {
            client_name: { type: 'string', description: 'Filter to a specific client (optional)' },
        }),
        tool('get_upcoming_deadlines', 'Get all upcoming court dates AND brief due dates within a window — the full deadline picture.', {
            days: { type: 'number', description: 'How many days ahead to look (default 14)' },
        }),
        tool('get_client_health', 'Identify clients who have had no recent payments — useful for follow-up and relationship management.', {
            days: { type: 'number', description: 'Inactivity threshold in days (default 60)' },
        }),
        tool('update_matter', 'Update fields on an existing matter — assign/change client, update court, judge, status, or lawyer in charge.', {
            matter_id: { type: 'string', description: 'The matter ID to update' },
            matter_title: { type: 'string', description: 'Search by matter title if ID unknown' },
            client_name: { type: 'string', description: 'New client name to assign (will look up by name)' },
            client_id: { type: 'string', description: 'New client ID to assign directly' },
            court: { type: 'string', description: 'Update the court name' },
            judge: { type: 'string', description: 'Update the judge name' },
            status: { type: 'string', description: 'Update status: active, closed, archived' },
            lawyer_in_charge_name: { type: 'string', description: 'Name of the lawyer to set as in-charge' },
        }),
        tool('update_brief', 'Update fields on an existing brief — assign/change client, matter, status, due date, or lawyer in charge.', {
            brief_id: { type: 'string', description: 'The brief ID to update' },
            brief_title: { type: 'string', description: 'Search by brief title if ID unknown' },
            client_name: { type: 'string', description: 'New client name to assign' },
            client_id: { type: 'string', description: 'New client ID to assign directly' },
            matter_title: { type: 'string', description: 'Matter title to link the brief to' },
            status: { type: 'string', description: 'Update status: active, closed, archived' },
            due_date: { type: 'string', description: 'New due date in ISO format' },
        }),
    ];
}

export async function executeTool(
    name: string,
    input: Record<string, any>,
    workspaceId: string,
    userId: string
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
                    brief: {
                        workspaceId,
                        ...(input.matter_title && { matter: { name: { contains: input.matter_title, mode: 'insensitive' } } }),
                    },
                    ...(input.search && { name: { contains: input.search, mode: 'insensitive' } }),
                },
                select: { id: true, name: true, uploadedAt: true, brief: { select: { name: true } } },
                orderBy: { uploadedAt: 'desc' },
                take: input.limit ?? 10,
            });
        }

        case 'analyse_document': {
            const doc = await prisma.document.findFirst({
                where: { id: input.document_id, brief: { workspaceId } },
                select: { name: true, url: true },
            });
            if (!doc?.url) return { error: 'Document not found or has no file attached.' };

            const fileResponse = await fetch(doc.url);
            if (!fileResponse.ok) return { error: 'Could not retrieve document file.' };

            const buffer = await fileResponse.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const rawMime = (fileResponse.headers.get('content-type') || '').split(';')[0].trim();
            const isPdf = rawMime === 'application/pdf' || doc.url.toLowerCase().includes('.pdf');
            const isImage = rawMime.startsWith('image/');

            const { default: Anthropic } = await import('@anthropic-ai/sdk');
            const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

            let docBlock: any;
            if (isPdf) {
                docBlock = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };
            } else if (isImage) {
                const mediaType = (rawMime || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
                docBlock = { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };
            } else {
                const text = Buffer.from(buffer).toString('utf-8').slice(0, 50000);
                const response = await client.messages.create({
                    model: 'claude-sonnet-4-6',
                    max_tokens: 2048,
                    messages: [{ role: 'user', content: `Document: "${doc.name}"\n\n${text}\n\n${input.question}` }],
                });
                const out = response.content[0]?.type === 'text' ? response.content[0].text : '';
                return { document_name: doc.name, analysis: out };
            }

            const response = await client.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 2048,
                messages: [{ role: 'user', content: [docBlock, { type: 'text', text: input.question }] }],
            });
            const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
            return { document_name: doc.name, analysis: text };
        }

        case 'create_client': {
            const existing = await prisma.client.findFirst({ where: { email: input.email, workspaceId } });
            if (existing) return { error: `A client with email ${input.email} already exists.` };
            const client = await prisma.client.create({
                data: {
                    name: input.name, email: input.email, workspaceId,
                    ...(input.phone && { phone: input.phone }),
                    ...(input.company && { company: input.company }),
                },
            });
            return { success: true, id: client.id, name: client.name, message: `Client "${client.name}" created successfully.` };
        }

        case 'create_matter': {
            let clientId: string | undefined;
            if (input.client_name) {
                const client = await prisma.client.findFirst({
                    where: { name: { contains: input.client_name, mode: 'insensitive' }, workspaceId },
                    select: { id: true },
                });
                if (client) clientId = client.id;
            }
            const matter = await prisma.matter.create({
                data: {
                    name: input.name, workspaceId, status: input.status ?? 'active',
                    ...(input.court && { court: input.court }),
                    ...(clientId && { clientId }),
                    lawyerInChargeId: userId,
                },
            });
            return { success: true, id: matter.id, name: matter.name, message: `Matter "${matter.name}" created successfully.` };
        }

        case 'create_brief': {
            let matterId: string | undefined;
            let clientId: string | undefined;
            if (input.matter_title) {
                const matter = await prisma.matter.findFirst({
                    where: { name: { contains: input.matter_title, mode: 'insensitive' }, workspaceId },
                    select: { id: true, clientId: true },
                });
                if (matter) { matterId = matter.id; clientId = matter.clientId ?? undefined; }
            }
            if (!clientId && input.client_name) {
                const client = await prisma.client.findFirst({
                    where: { name: { contains: input.client_name, mode: 'insensitive' }, workspaceId },
                    select: { id: true },
                });
                if (client) clientId = client.id;
            }
            const year = new Date().getFullYear();
            const count = await prisma.brief.count({ where: { workspaceId } });
            const briefNumber = `EUR-${year}-${String(count + 1).padStart(4, '0')}`;
            const brief = await prisma.brief.create({
                data: {
                    briefNumber, name: input.name, category: input.category,
                    workspaceId, lawyerId: userId, status: 'active',
                    ...(matterId && { matterId }),
                    ...(clientId && { clientId }),
                    ...(input.due_date && { dueDate: new Date(input.due_date) }),
                    ...(input.description && { description: input.description }),
                },
            });
            return { success: true, id: brief.id, name: brief.name, briefNumber: brief.briefNumber, message: `Brief "${brief.name}" (${brief.briefNumber}) created successfully.` };
        }

        case 'create_court_date': {
            let matterId: string | undefined;
            if (input.matter_title) {
                const matter = await prisma.matter.findFirst({
                    where: { name: { contains: input.matter_title, mode: 'insensitive' }, workspaceId },
                    select: { id: true },
                });
                if (!matter) return { error: `No matter found matching "${input.matter_title}". Please check the matter title.` };
                matterId = matter.id;
            }
            const entry = await prisma.calendarEntry.create({
                data: {
                    date: new Date(input.date),
                    type: input.type === 'MEETING' ? 'MEETING' : 'COURT',
                    ...(matterId && { matterId }),
                    ...(input.court && { court: input.court }),
                    ...(input.proceedings && { proceedings: input.proceedings }),
                },
            });
            return { success: true, id: entry.id, date: entry.date, message: `Court date scheduled for ${new Date(input.date).toLocaleDateString('en-NG', { dateStyle: 'long' })}.` };
        }

        case 'get_inactive_matters': {
            const days = input.days ?? 30;
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            const matters = await prisma.matter.findMany({
                where: { workspaceId, status: 'active', lastActivityAt: { lt: cutoff } },
                select: { id: true, name: true, court: true, lastActivityAt: true, client: { select: { name: true } } },
                orderBy: { lastActivityAt: 'asc' },
                take: 20,
            });
            return { threshold_days: days, count: matters.length, matters };
        }

        case 'get_overdue_invoices': {
            const now = new Date();
            const clientFilter = input.client_name
                ? { workspaceId, name: { contains: input.client_name, mode: 'insensitive' as const } }
                : { workspaceId };
            const invoices = await prisma.invoice.findMany({
                where: { client: clientFilter, dueDate: { lt: now }, NOT: { status: { in: ['paid', 'PAID'] } } },
                select: {
                    id: true, invoiceNumber: true, totalAmount: true, dueDate: true, status: true,
                    client: { select: { id: true, name: true } },
                },
                orderBy: { dueDate: 'asc' },
                take: 30,
            });
            const total = invoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
            return { count: invoices.length, total_overdue: total, invoices };
        }

        case 'get_upcoming_deadlines': {
            const now = new Date();
            const days = input.days ?? 14;
            const boundary = new Date();
            boundary.setDate(boundary.getDate() + days);
            const [courtDates, briefs] = await Promise.all([
                prisma.calendarEntry.findMany({
                    where: { type: 'COURT', date: { gte: now, lte: boundary }, matter: { workspaceId } },
                    select: { id: true, date: true, court: true, proceedings: true, matter: { select: { id: true, name: true } } },
                    orderBy: { date: 'asc' },
                    take: 20,
                }),
                prisma.brief.findMany({
                    where: { workspaceId, status: 'active', dueDate: { gte: now, lte: boundary } },
                    select: { id: true, name: true, dueDate: true, category: true, client: { select: { name: true } } },
                    orderBy: { dueDate: 'asc' },
                    take: 20,
                }),
            ]);
            return { window_days: days, court_dates: courtDates, brief_deadlines: briefs };
        }

        case 'get_client_health': {
            const days = input.days ?? 60;
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            const clients = await prisma.client.findMany({
                where: { workspaceId },
                select: {
                    id: true, name: true, email: true,
                    payments: { orderBy: { date: 'desc' }, take: 1, select: { date: true, amount: true } },
                    matters: { where: { status: 'active' }, select: { id: true } },
                    invoices: { where: { NOT: { status: { in: ['paid', 'PAID'] } } }, select: { totalAmount: true } },
                },
            });
            const flagged = clients
                .map(c => ({
                    id: c.id, name: c.name, email: c.email,
                    last_payment: c.payments[0]?.date ?? null,
                    last_payment_amount: c.payments[0]?.amount ?? null,
                    active_matters: c.matters.length,
                    outstanding_balance: c.invoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0),
                    needs_attention: !c.payments[0] || new Date(c.payments[0].date) < cutoff,
                }))
                .filter(c => c.needs_attention);
            return { threshold_days: days, flagged_count: flagged.length, clients: flagged };
        }

        case 'update_matter': {
            // Resolve matter
            const matter = await prisma.matter.findFirst({
                where: input.matter_id
                    ? { id: input.matter_id, workspaceId }
                    : { name: { contains: input.matter_title, mode: 'insensitive' }, workspaceId },
                select: { id: true, name: true },
            });
            if (!matter) return { error: 'Matter not found.' };

            const updates: Record<string, any> = {};

            // Resolve client
            if (input.client_id) {
                updates.clientId = input.client_id;
            } else if (input.client_name) {
                const client = await prisma.client.findFirst({
                    where: { name: { contains: input.client_name, mode: 'insensitive' }, workspaceId },
                    select: { id: true, name: true },
                });
                if (!client) return { error: `Client "${input.client_name}" not found. Create them first.` };
                updates.clientId = client.id;
            }

            if (input.court) updates.court = input.court;
            if (input.judge) updates.judge = input.judge;
            if (input.status) updates.status = input.status;

            if (input.lawyer_in_charge_name) {
                const lawyer = await prisma.workspaceMember.findFirst({
                    where: { workspaceId, user: { name: { contains: input.lawyer_in_charge_name, mode: 'insensitive' } } },
                    include: { user: { select: { id: true, name: true } } },
                });
                if (lawyer) updates.lawyerInChargeId = lawyer.userId;
            }

            if (Object.keys(updates).length === 0) return { error: 'No valid fields provided to update.' };

            const updated = await prisma.matter.update({
                where: { id: matter.id },
                data: { ...updates, lastActivityAt: new Date() },
                include: { client: { select: { name: true } } },
            });

            return {
                success: true,
                matter: { id: updated.id, name: updated.name, client: updated.client?.name ?? null },
                message: `Matter "${updated.name}" updated successfully.`,
            };
        }

        case 'update_brief': {
            const brief = await prisma.brief.findFirst({
                where: input.brief_id
                    ? { id: input.brief_id, workspaceId }
                    : { name: { contains: input.brief_title, mode: 'insensitive' }, workspaceId },
                select: { id: true, name: true },
            });
            if (!brief) return { error: 'Brief not found.' };

            const updates: Record<string, any> = {};

            if (input.client_id) {
                updates.clientId = input.client_id;
            } else if (input.client_name) {
                const client = await prisma.client.findFirst({
                    where: { name: { contains: input.client_name, mode: 'insensitive' }, workspaceId },
                    select: { id: true },
                });
                if (!client) return { error: `Client "${input.client_name}" not found.` };
                updates.clientId = client.id;
            }

            if (input.matter_title) {
                const matter = await prisma.matter.findFirst({
                    where: { name: { contains: input.matter_title, mode: 'insensitive' }, workspaceId },
                    select: { id: true },
                });
                if (matter) updates.matterId = matter.id;
            }

            if (input.status) updates.status = input.status;
            if (input.due_date) updates.dueDate = new Date(input.due_date);

            if (Object.keys(updates).length === 0) return { error: 'No valid fields provided to update.' };

            const updated = await prisma.brief.update({
                where: { id: brief.id },
                data: updates,
                include: { client: { select: { name: true } } },
            });

            return {
                success: true,
                brief: { id: updated.id, name: updated.name, client: updated.client?.name ?? null },
                message: `Brief "${updated.name}" updated successfully.`,
            };
        }

        default:
            return { error: `Unknown tool: ${name}` };
    }
}
