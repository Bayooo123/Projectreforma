import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { getClientById } from '@/app/actions/clients';
import ClientDetailClient from './ClientDetailClient';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const result = await getClientById(id);
    if (!result.success || !result.data) notFound();

    return <ClientDetailClient client={result.data as any} />;
}
