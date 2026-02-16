import { listUsers } from '../../actions/admin';
import UsersClient from './UsersClient';
import styles from '../waitlist/page.module.css';

export default async function UsersPage() {
    const users = await listUsers();

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>User Management</h1>
                <p className={styles.subtitle}>Directory of all practitioners across the Reforma network</p>
            </header>

            <UsersClient users={users} />
        </div>
    );
}
