import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import OfficeManagerClient from "./OfficeManagerClient";
import { PinProtection } from "@/components/auth/PinProtection";

export const dynamic = 'force-dynamic';

export default async function OfficeManagementPage() {
    const session = await auth();
    if (!session?.user?.id) return redirect('/login');

    const workspaceId = session.user.workspaceId;
    if (!workspaceId) return redirect('/onboarding');

    // Fetch user membership for role-based permissions
    const membership = await prisma.workspaceMember.findFirst({
        where: {
            workspaceId,
            userId: session.user.id
        },
        include: {
            workspace: {
                select: { ownerId: true }
            }
        }
    });

    const userRole = membership?.role || 'Associate';
    const isOwner = membership?.workspace.ownerId === session.user.id;

    // Pre-fetch initial financial data server-side
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const expenses = await prisma.expense.findMany({
        where: {
            workspaceId,
            date: { gte: firstDay, lte: lastDay }
        },
        orderBy: { date: 'desc' }
    });

    const byDate = expenses.reduce((acc, expense) => {
        const dateKey = expense.date.toISOString().split('T')[0];
        if (!acc[dateKey]) {
            acc[dateKey] = { total: 0, count: 0 };
        }
        acc[dateKey].total += expense.amount;
        acc[dateKey].count += 1;
        return acc;
    }, {} as Record<string, { total: number; count: number }>);

    const summaries = Object.keys(byDate).sort().reverse().map(dateKey => ({
        date: dateKey,
        total: byDate[dateKey].total,
        count: byDate[dateKey].count
    }));

    // Serialize dates for Client Component transmission
    const serializedExpenses = expenses.map(e => ({
        ...e,
        date: e.date.toISOString(),
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
    }));

    return (
        <div className="p-8">
            <PinProtection
                workspaceId={workspaceId}
                featureId="office"
                variant="office"
            >
                <OfficeManagerClient
                    workspaceId={workspaceId}
                    initialExpenses={serializedExpenses}
                    initialSummaries={summaries}
                    userRole={userRole}
                    isOwner={isOwner}
                />
            </PinProtection>
        </div>
    );
}
