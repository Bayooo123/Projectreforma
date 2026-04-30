import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '@/lib/config';

const prisma = new PrismaClient();

export class BriefSummarizer {

    static async summarize(briefId: string): Promise<string> {
        const apiKey = config.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured.');

        const brief = await prisma.brief.findUnique({
            where: { id: briefId },
            include: {
                matter: true,
                tasks: { select: { title: true, description: true, status: true } },
                documents: {
                    select: { name: true, ocrText: true },
                    where: { ocrStatus: 'completed', ocrText: { not: null } },
                },
            },
        });

        if (!brief) throw new Error('Brief not found');

        const taskLines = brief.tasks
            .map(t => `- ${t.title} (${t.status}): ${t.description || 'No details'}`)
            .join('\n');

        const docLines = brief.documents
            .map(d => `Document: ${d.name}\nContent: ${d.ocrText?.substring(0, 3000)}`)
            .join('\n\n');

        const matterContext = brief.matter
            ? JSON.stringify({ name: brief.matter.name, court: brief.matter.court, status: brief.matter.status })
            : 'Not linked to a matter';

        const prompt = `You are a senior legal assistant. Summarize the following legal brief for a law firm. Provide a clear, high-level overview of what is happening in this brief.

BRIEF NAME: ${brief.name}
CATEGORY: ${brief.category}
DESCRIPTION: ${brief.description || 'No description provided.'}

MATTER CONTEXT: ${matterContext}

TASKS & PROGRESS:
${taskLines || 'No tasks recorded.'}

EXTRACTED DOCUMENT CONTENT:
${docLines || 'No documents with OCR text available.'}

INSTRUCTIONS:
- Focus on key dates, parties involved, and the current status of the work.
- Keep it professional and concise (max 250 words).
- Highlight any urgent pending tasks.
- Use clear headings if necessary.`;

        const client = new Anthropic({ apiKey });
        const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
        });

        const summary = response.content[0]?.type === 'text' ? response.content[0].text : '';
        if (!summary) throw new Error('Failed to generate summary with AI');

        await prisma.brief.update({
            where: { id: briefId },
            data: { summary, lastSummarizedAt: new Date() },
        });

        return summary;
    }
}
