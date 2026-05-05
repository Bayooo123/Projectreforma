import styles from './BriefList.module.css';

export default function BriefTableSkeleton() {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className="space-y-2">
                    <div className="h-8 w-44 rounded-lg bg-slate-500/[0.08]" />
                    <div className="h-4 w-64 rounded bg-slate-500/[0.06]" />
                </div>
                <div className="h-10 w-32 rounded-lg bg-slate-500/[0.07]" />
            </div>

            <div className={styles.toolbar}>
                <div className="flex-1 h-10 max-w-md rounded-lg bg-slate-500/[0.07]" />
                <div className="h-10 w-28 rounded-lg bg-slate-500/[0.07] ml-4" />
            </div>

            <div className="rounded-xl border border-slate-500/[0.08] overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-500/[0.06] flex gap-6">
                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                        <div key={i} className="h-3.5 flex-1 rounded bg-slate-500/[0.09]" />
                    ))}
                </div>
                {[1, 2, 3, 4, 5, 6].map(row => (
                    <div key={row} className="px-4 py-3.5 border-b border-slate-500/[0.04] flex gap-6">
                        {[1, 2, 3, 4, 5, 6, 7].map(i => (
                            <div key={i} className="h-4 flex-1 rounded bg-slate-500/[0.05]" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
