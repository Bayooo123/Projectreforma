import { signOut } from '@/auth';

// Posted to by the studio's "Log out" button.
export async function POST() {
    await signOut({ redirectTo: '/ojogbon' });
}
