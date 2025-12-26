
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { AgentChat } from '@/components/drafting/AgentChat';
import { LiveEditorWrapper } from './LiveEditorWrapper';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';

interface DraftingPageProps {
    params: Promise<{
        briefId: string;
    }>
}

export default async function DraftingPage(props: DraftingPageProps) {
    const params = await props.params;
    const { briefId } = params;

    // 1. Fetch Brief Context
    const brief = await prisma.brief.findUnique({
        where: { id: briefId },
        include: {
            client: true,
            matter: true,
            _count: { select: { documents: true } }
        }
    });

    if (!brief) {
        return notFound();
    }

    return (
        <div className="min-h-screen bg-slate-50/50 -m-8 p-8"> {/* Negative margin to break out of dashboard padding if needed, or just standard p-8 */}

            {/* Header / Breadcrumb */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/management/briefs/${briefId}`} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                            Review & Draft
                            <span className="text-xs font-normal px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full border border-teal-200">
                                AI Assisted
                            </span>
                        </h1>
                        <p className="text-sm text-slate-500">
                            Context: <span className="font-medium text-slate-700">{brief.name}</span> •
                            {brief.client.name} •
                            <span className="flex items-center inline-flex gap-1 ml-2 text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                                <FileText className="w-3 h-3" /> {brief._count.documents} Docs
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Split Screen Application */}
            <LiveEditorWrapper briefId={briefId} />

        </div>
    );
}
