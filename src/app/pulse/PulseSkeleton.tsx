export default function PulseSkeleton() {
    return (
        <div className="p-6 animate-pulse space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
                ))}
            </div>
            {/* Feed rows */}
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800" />
                ))}
            </div>
            {/* Bottom grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800" />
                <div className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800" />
            </div>
        </div>
    );
}
