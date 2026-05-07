import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

function tool(name: string, description: string, properties: Record<string, any>, required?: string[]) {
    return { name, description, input_schema: { type: 'object' as const, properties, ...(required && { required }) } };
}

const RESOLUTION_TOOLS = [
    tool('record_court_outcome', 'Record the proceedings and outcome for a past court hearing.', {
        calendarEntryId: { type: 'string', description: 'The calendar entry ID' },
        proceedings: { type: 'string', description: 'What the hearing was for / subject matter' },
        outcome: { type: 'string', description: 'What was decided or happened at the hearing' },
        adjournedTo: { type: 'string', description: 'ISO date if the matter was adjourned to a new date' },
    }, ['calendarEntryId']),

    tool('update_client_contact', 'Update a client\'s real contact details to replace placeholder data.', {
        clientId: { type: 'string', description: 'The client ID' },
        email: { type: 'string', description: 'The client\'s real email address' },
        phone: { type: 'string', description: 'The client\'s real phone number' },
        company: { type: 'string', description: 'Company name if applicable' },
    }, ['clientId']),

    tool('record_expense', 'Record one or more office expenses for a period.', {
        amount: { type: 'number', description: 'Amount in Naira' },
        category: { type: 'string', description: 'OFFICE_UTILITIES | OFFICE_EQUIPMENT_MAINTENANCE | COURT_LITIGATION | NON_LITIGATION_ADVISORY | COMMUNICATION_SUBSCRIPTIONS | STAFF_COSTS | VEHICLE_LOGISTICS | MISCELLANEOUS' },
        date: { type: 'string', description: 'ISO date string e.g. 2026-04-15' },
        description: { type: 'string', description: 'What this expense was for' },
        reference: { type: 'string', description: 'Receipt or reference number (optional)' },
    }, ['amount', 'category', 'date', 'description']),

    tool('schedule_hearing', 'Schedule a new court hearing for a matter.', {
        matterId: { type: 'string', description: 'The matter ID' },
        date: { type: 'string', description: 'ISO datetime e.g. 2026-06-10T09:00:00' },
        court: { type: 'string', description: 'Court name' },
        proceedings: { type: 'string', description: 'Purpose of the hearing e.g. Cross-examination' },
    }, ['matterId', 'date']),

    tool('complete_milestone', 'Mark a litigation milestone as completed and cascade due dates to subsequent milestones.', {
        milestoneId: { type: 'string', description: 'The LitigationMilestone ID to mark completed' },
        notes: { type: 'string', description: 'Brief note on what was done / filed' },
        completedDate: { type: 'string', description: 'ISO date when the milestone was actually completed (defaults to today)' },
    }, ['milestoneId']),

    tool('mark_resolved', 'Mark the current anomaly as resolved once the issue has been fixed.', {
        anomalyId: { type: 'string', description: 'The anomaly ID to mark resolved' },
        note: { type: 'string', description: 'Short note on how it was resolved' },
    }, ['anomalyId']),
];

async function executeTool(name: string, input: Record<string, any>, workspaceId: string, userId: string) {
    switch (name) {
        case 'record_court_outcome': {
            const entry = await prisma.calendarEntry.findFirst({
                where: { id: input.calendarEntryId, matter: { workspaceId } },
                select: { id: true },
            });
            if (!entry) return { error: 'Calendar entry not found.' };
            const data: any = {};
            if (input.proceedings) data.proceedings = input.proceedings;
            if (input.outcome) data.outcome = input.outcome;
            if (input.adjournedTo) data.adjournedTo = new Date(input.adjournedTo);
            await prisma.calendarEntry.update({ where: { id: entry.id }, data });
            return { success: true, message: 'Court outcome recorded.' };
        }

        case 'update_client_contact': {
            const client = await prisma.client.findFirst({ where: { id: input.clientId, workspaceId }, select: { id: true } });
            if (!client) return { error: 'Client not found.' };
            const data: any = {};
            if (input.email) data.email = input.email;
            if (input.phone) data.phone = input.phone;
            if (input.company) data.company = input.company;
            await prisma.client.update({ where: { id: client.id }, data });
            return { success: true, message: 'Client contact details updated.' };
        }

        case 'record_expense': {
            await prisma.expense.create({
                data: {
                    workspaceId,
                    amount: input.amount,
                    category: input.category as any,
                    date: new Date(input.date),
                    description: input.description,
                    reference: input.reference,
                },
            });
            return { success: true, message: `₦${Number(input.amount).toLocaleString()} expense recorded under ${input.category}.` };
        }

        case 'schedule_hearing': {
            const matter = await prisma.matter.findFirst({ where: { id: input.matterId, workspaceId }, select: { id: true } });
            if (!matter) return { error: 'Matter not found.' };
            const entry = await prisma.calendarEntry.create({
                data: {
                    matterId: matter.id,
                    date: new Date(input.date),
                    type: 'COURT',
                    court: input.court,
                    proceedings: input.proceedings,
                },
            });
            return { success: true, id: entry.id, message: `Hearing scheduled for ${new Date(input.date).toLocaleDateString('en-NG', { dateStyle: 'long' })}.` };
        }

        case 'complete_milestone': {
            const milestone = await prisma.litigationMilestone.findFirst({
                where: { id: input.milestoneId, workspaceId },
                select: { id: true, type: true },
            });
            if (!milestone) return { error: 'Milestone not found.' };
            const completedAt = input.completedDate ? new Date(input.completedDate) : new Date();
            const { completeMilestone } = await import('@/app/actions/litigation-milestones');
            const result = await completeMilestone(milestone.id, input.notes, completedAt);
            if (!result.success) return { error: result.error };
            return { success: true, message: `Milestone marked complete. Subsequent deadline dates have been updated.` };
        }

        case 'mark_resolved': {
            await prisma.workspaceAnomaly.update({
                where: { id: input.anomalyId },
                data: { status: 'resolved', resolvedAt: new Date(), resolvedById: userId },
            });
            return { success: true, resolved: true, message: 'Anomaly marked as resolved.' };
        }

        default:
            return { error: `Unknown tool: ${name}` };
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    const workspaceId = session.user.workspaceId;
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    const { anomaly, messages } = await req.json();
    if (!anomaly || !messages?.length) return NextResponse.json({ error: 'Missing anomaly or messages' }, { status: 400 });

    const systemPrompt = `You are Forma, the proactive operations agent for Reforma OS — a Nigerian law firm management platform.

You are currently resolving a specific anomaly. Here is the issue:

ANOMALY TYPE: ${anomaly.type}
SEVERITY: ${anomaly.severity}
TITLE: ${anomaly.title}
ANOMALY ID: ${anomaly.id}
RESOURCE: ${anomaly.resourceName ?? 'N/A'} (${anomaly.resourceType ?? 'N/A'}, ID: ${anomaly.resourceId ?? 'N/A'})
CONTEXT: ${JSON.stringify(anomaly.context ?? {})}

YOUR JOB:
1. Ask the user for the specific information needed to resolve this issue
2. When you have the information, use the available tools to fix it
3. After fixing, call mark_resolved with the anomaly ID
4. Confirm what was done in plain language

RULES:
- Be direct and specific — you already know what the issue is, so ask targeted questions
- Don't ask for information you already have from the context
- If the user provides multiple expenses at once, record each separately with individual record_expense calls
- Format monetary amounts in Naira (₦)
- After mark_resolved succeeds, end with: "✓ Resolved. [what was done]"`;

    let currentMessages: Anthropic.MessageParam[] = messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'assistant' as const,
        content: m.content,
    }));

    let response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        tools: RESOLUTION_TOOLS,
        messages: currentMessages,
    });

    let iterations = 0;
    while (response.stop_reason === 'tool_use' && iterations < 8) {
        iterations++;
        const toolBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
        const results = await Promise.all(toolBlocks.map(async b => ({
            type: 'tool_result' as const,
            tool_use_id: b.id,
            content: JSON.stringify(await executeTool(b.name, b.input as Record<string, any>, workspaceId, session.user.id)),
        })));
        currentMessages = [
            ...currentMessages,
            { role: 'assistant' as const, content: response.content },
            { role: 'user' as const, content: results },
        ];
        response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: systemPrompt,
            tools: RESOLUTION_TOOLS,
            messages: currentMessages,
        });
    }

    const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    const resolved = currentMessages.some(m =>
        Array.isArray(m.content) &&
        m.content.some(c => c.type === 'tool_result' && typeof c.content === 'string' && c.content.includes('"resolved":true'))
    );

    return NextResponse.json({ message: text?.text ?? 'Done.', resolved });
}
