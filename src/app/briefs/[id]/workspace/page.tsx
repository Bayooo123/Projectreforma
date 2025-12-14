import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getBriefById } from '@/app/actions/briefs';
import CopilotWorkspace from '@/components/briefs/CopilotWorkspace';

export const dynamic = 'force-dynamic';

interface WorkspacePageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function WorkspacePage(props: WorkspacePageProps) {
    const params = await props.params;
    const { id } = params;
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    const brief = await getBriefById(id);

    if (!brief) {
        redirect('/briefs');
    }

    return (
        <CopilotWorkspace
            briefId={brief.id}
            briefName={brief.name}
            initialContent={`[DRAFT]\n\nRE: ${brief.name}\n\n...`}
        />
    );
}
