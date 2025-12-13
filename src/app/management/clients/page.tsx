import { Plus, Download } from 'lucide-react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import ClientsPageClient from './ClientsPageClient';
import styles from './page.module.css';

export default async function ClientsPage() {
    const session = await auth();

    if (!session?.user?.email) {
        redirect('/auth/signin');
    }

    // Get user's workspace
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
            workspaces: {
                include: {
                    workspace: true,
                },
            },
        },
    });

    if (!user || user.workspaces.length === 0) {
        redirect('/onboarding');
    }

    const workspace = user.workspaces[0].workspace;

    return (
        <div className={styles.page}>
            <ClientsPageClient workspaceId={workspace.id} userId={user.id} letterheadUrl={workspace.letterheadUrl} />
        </div>
    );
}
