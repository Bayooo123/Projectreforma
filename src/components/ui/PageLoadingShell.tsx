export default function PageLoadingShell() {
    return (
        <div className="w-full h-full p-6 space-y-5 pointer-events-none select-none">
            <div className="space-y-2">
                <div className="h-8 w-44 rounded-lg bg-slate-500/[0.08]" />
                <div className="h-4 w-64 rounded bg-slate-500/[0.06]" />
            </div>
            <div className="w-full rounded-2xl bg-slate-500/[0.05]" style={{ minHeight: '65vh' }} />
        </div>
    );
}
