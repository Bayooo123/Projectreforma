import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ChatView from './ChatView';

export default async function ChatPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    if (!session.user.workspaceId) {
        redirect('/onboarding');
    }

    return <ChatView />;
}
