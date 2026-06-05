import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import EmailInboxClient from './EmailInboxClient';

export default async function EmailInboxPage() {
    const session = await auth();
    if (!session?.user) redirect('/login');
    // All data fetched client-side on mount — avoids SSR timeout on large inboxes
    return <EmailInboxClient />;
}
