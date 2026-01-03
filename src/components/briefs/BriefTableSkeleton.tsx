import styles from './BriefList.module.css';

export default function BriefTableSkeleton() {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className="animate-pulse">
                    <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                    <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
                <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>

            <div className={styles.toolbar}>
                <div className="flex-1 h-10 w-full max-w-md bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                <div className="h-10 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse ml-4"></div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.checkboxCell}><div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                            {['No.', 'Brief Name', 'Client Name', 'Lawyer', 'Category', 'Due date', 'Status', 'Actions'].map((h) => (
                                <th key={h}><div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div></th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <tr key={i}>
                                <td className={styles.checkboxCell}><div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded"></div></td>
                                <td><div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div></td>
                                <td>
                                    <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-1 animate-pulse"></div>
                                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                                </td>
                                <td><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div></td>
                                <td><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div></td>
                                <td><div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div></td>
                                <td><div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div></td>
                                <td><div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div></td>
                                <td><div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
