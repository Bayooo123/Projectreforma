import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { getInvoiceById } from '@/app/actions/invoices';
import InvoiceDetailClient from './InvoiceDetailClient';

export const dynamic = 'force-dynamic';

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const result = await getInvoiceById(params.id);
    if (!result.success || !result.data) notFound();

    return <InvoiceDetailClient invoice={result.data as any} />;
}
