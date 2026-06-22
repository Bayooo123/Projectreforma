import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import AgentClient from './AgentClient';

export const metadata = { title: 'Email Link Agent' };

export default async function EmailAgentPage() {
    const session = await auth();
    if (!session?.user) redirect('/login');
    return <AgentClient />;
}
