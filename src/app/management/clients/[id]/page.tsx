import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { getClientById } from '@/app/actions/clients';
import ClientDetailClient from './ClientDetailClient';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const result = await getClientById(params.id);
    if (!result.success || !result.data) notFound();

    return <ClientDetailClient client={result.data as any} />;
}
