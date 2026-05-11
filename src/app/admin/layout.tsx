import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import AdminSidebar from '@/components/layout/AdminSidebar';
import AdminHeader from '@/components/layout/AdminHeader';
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
            <AdminSidebar user={session.user} />
            <div className={styles.main}>
                <AdminHeader user={session.user} />
                <div className={styles.content}>
                    {children}
                </div>
            </div>
        </div>
    );
}
