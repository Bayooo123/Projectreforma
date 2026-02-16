import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import AdminSidebar from '@/components/layout/AdminSidebar';
import styles from '@/components/layout/AppLayout.module.css';
import Header from '@/components/layout/Header';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
    const session = await auth();

    if (!session?.user?.isPlatformAdmin) {
        redirect('/briefs'); // Or a forbidden page if we have one
    }

    return (
        <div className={styles.gridContainer}>
            <aside className={styles.sidebar}>
                <AdminSidebar user={session.user} />
            </aside>
            <div className={styles.mainContent}>
                <div className={styles.headerWrapper}>
                    <Header user={session.user} />
                </div>
                <main className={styles.contentArea}>
                    <div className={styles.contentContainer}>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
