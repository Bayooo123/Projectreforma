import { auth } from "@/auth";
import { getDashboardStats } from "@/app/actions/dashboard";
import { OverviewClient } from "./OverviewClient";
import { redirect } from "next/navigation";

export default async function OverviewPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/auth/login");
    }

    const stats = await getDashboardStats();

    // Extract first name for greeting
    const firstName = session.user.name?.split(' ')[0] || "Lawyer";

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
            <OverviewClient stats={stats} firstName={firstName} />
        </main>
    );
}
