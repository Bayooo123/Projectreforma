import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import OnboardingClient from './OnboardingClient';

export default async function ReformaXOnboardingPage() {
    const session = await auth();
    if (!session?.user?.workspaceId) redirect('/x/login');

    const workspace = await prisma.workspace.findUnique({
        where: { id: session.user.workspaceId },
        select: { practiceFocus: true },
    });

    if (workspace?.practiceFocus) redirect('/ai-native');

    return <OnboardingClient />;
}
