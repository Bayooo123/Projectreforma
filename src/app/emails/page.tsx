import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getInboxEmails, getInboxBriefs } from '@/app/actions/email-inbox';
import EmailInboxClient from './EmailInboxClient';

export default async function EmailInboxPage() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const [emails, briefs] = await Promise.all([
        getInboxEmails('all'),
        getInboxBriefs(),
    ]);

    return <EmailInboxClient emails={emails} briefs={briefs} />;
}
