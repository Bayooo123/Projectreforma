import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import AdminSidebar from '@/components/layout/AdminSidebar';
import styles from './admin.module.css';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
    const session = await auth();

    if (!session?.user?.isPlatformAdmin) {
        redirect('/briefs');
    }

    return (
        <div className={styles.shell}>
            <aside className={styles.sidebar}>
                <AdminSidebar user={session.user} />
            </aside>
            <main className={styles.main}>
                <div className={styles.content}>
                    {children}
                </div>
            </main>
        </div>
    );
}
