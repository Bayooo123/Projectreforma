import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');
        const workspaceId = searchParams.get('workspaceId');

        if (!query || query.length < 2) {
            return NextResponse.json({ results: [] });
        }

        if (!workspaceId) {
            return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
        }

        // Search in Documents (ocrText) and Briefs
        const [documents, briefs] = await Promise.all([
            prisma.document.findMany({
                where: {
                    brief: { workspaceId },
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { ocrText: { contains: query, mode: 'insensitive' } }
                    ]
                },
                include: {
                    brief: {
                        select: {
                            id: true,
                            name: true,
                            briefNumber: true
                        }
                    }
                },
                take: 20
            }),
            prisma.brief.findMany({
                where: {
                    workspaceId,
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { briefNumber: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                        { summary: { contains: query, mode: 'insensitive' } }
                    ]
                },
                take: 10
            })
        ]);

        // Format results for UI
        const results = [
            ...briefs.map(b => ({
                id: b.id,
                type: 'brief',
                title: b.name,
                subtitle: b.briefNumber,
                url: `/briefs/${b.id}`,
                matchType: 'Brief Info'
            })),
            ...documents.map(d => {
                // Find index of query in ocrText for context snippet
                const text = d.ocrText || '';
                const index = text.toLowerCase().indexOf(query.toLowerCase());
                let snippet = '';
                
                if (index !== -1) {
                    const start = Math.max(0, index - 40);
                    const end = Math.min(text.length, index + query.length + 60);
                    snippet = (start > 0 ? '...' : '') + text.substring(start, end).replace(/\n/g, ' ') + (end < text.length ? '...' : '');
                }

                return {
                    id: d.id,
                    type: 'document',
                    title: d.name,
                    subtitle: `Brief: ${d.brief.name}`,
                    url: `/briefs/${d.brief.id}?doc=${d.id}`,
                    snippet,
                    matchType: d.name.toLowerCase().includes(query.toLowerCase()) ? 'Filename' : 'Content Match'
                };
            })
        ];

        return NextResponse.json({ results });

    } catch (error: any) {
        console.error('[Search API] Error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}
