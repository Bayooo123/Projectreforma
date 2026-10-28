import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import AuthForm from '../AuthForm';

export const metadata: Metadata = { title: 'Create your account | Ojogbon' };

export default async function SignUpPage() {
    const session = await auth();
    if (session?.user?.id) redirect('/ojogbon/app');
    return <AuthForm mode="signup" />;
}
