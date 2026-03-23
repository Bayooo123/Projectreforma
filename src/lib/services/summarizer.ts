import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from "@google/generative-ai";

import { config } from '@/lib/config';

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(config.GOOGLE_API_KEY || '');

export class BriefSummarizer {
    /**
     * Summarizes a brief by aggregating all its related data (Description, Matter, Tasks, and Document OCR text).
     */
    static async summarize(briefId: string): Promise<string> {
        // 1. Fetch complete brief data
        const brief = await prisma.brief.findUnique({
            where: { id: briefId },
            include: {
                matter: true,
                tasks: {
                    select: {
                        title: true,
                        description: true,
                        status: true
                    }
                },
                documents: {
                    select: {
                        name: true,
                        ocrText: true
                    },
                    where: {
                        ocrStatus: 'completed',
                        ocrText: { not: null }
                    }
                }
            }
        });

        if (!brief) {
            throw new Error('Brief not found');
        }

        // 2. Prepare context for AI
        const context = {
            briefName: brief.name,
            category: brief.category,
            description: brief.description || 'No description provided.',
            matter: brief.matter ? {
                name: brief.matter.name,
                court: brief.matter.court,
                status: brief.matter.status
            } : 'Not linked to a matter',
            tasks: brief.tasks.map(t => `- ${t.title} (${t.status}): ${t.description || 'No details'}`),
            documents: brief.documents.map(d => ({
                name: d.name,
                // Include first 3000 chars of OCR text per document to stay within token limits
                text: d.ocrText?.substring(0, 3000)
            }))
        };

        const prompt = `
            You are a senior legal assistant. Summarize the following legal brief for a law firm.
            Provide a clear, high-level overview of what is happening in this brief.
            
            BRIEF NAME: ${context.briefName}
            CATEGORY: ${context.category}
            DESCRIPTION: ${context.description}
            
            MATTER CONTEXT: ${JSON.stringify(context.matter)}
            
            TASKS & PROGRESS:
            ${context.tasks.join('\n')}
            
            EXTRACTED DOCUMENT CONTENT:
            ${context.documents.map(d => `Document: ${d.name}\nContent: ${d.text}`).join('\n\n')}
            
            INSTRUCTIONS:
            - Focus on key dates, parties involved, and the current status of the work.
            - Keep it professional and concise (max 250 words).
            - Highlight any urgent pending tasks.
            - Use clear headings if necessary.
        `;

        // 3. Generate summary using Gemini
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            const summary = result.response.text();

            // 4. Save summary back to database
            await prisma.brief.update({
                where: { id: briefId },
                data: {
                    summary,
                    lastSummarizedAt: new Date()
                }
            });

            return summary;
        } catch (error) {
            console.error('[BriefSummarizer] AI Generation Error:', error);
            throw new Error('Failed to generate summary with AI');
        }
    }
}
