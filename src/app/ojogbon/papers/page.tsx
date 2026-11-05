import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import PapersList from './PapersList';

export const metadata: Metadata = { title: 'My papers | Ojogbon' };

export default async function PapersPage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/ojogbon/login');
    return <PapersList userName={session.user.name ?? null} />;
}
