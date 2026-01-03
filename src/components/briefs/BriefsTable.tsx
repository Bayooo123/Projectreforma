import { getBriefs } from "@/app/actions/briefs";
import Link from 'next/link';
import { Eye, Briefcase, MoreVertical, MessageSquare, Edit, Trash2 } from 'lucide-react';
import BriefListClient from "./BriefListClient";

// Server Component for fetching data
export default async function BriefsTable({ workspaceId, searchQuery, statusFilter }: { workspaceId: string, searchQuery?: string, statusFilter?: string }) {
    // Fetch data on the server
    const briefData = await getBriefs(workspaceId);

    // Filter on server (or passed down if API supported filtering params)
    const filteredBriefs = briefData.filter((brief: any) => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                brief.name.toLowerCase().includes(query) ||
                brief.briefNumber.toLowerCase().includes(query) ||
                brief.client?.name.toLowerCase().includes(query) ||
                brief.category.toLowerCase().includes(query);
            if (!matchesSearch) return false;
        }
        // Status filter
        if (statusFilter && statusFilter !== 'all' && brief.status.toLowerCase() !== statusFilter) {
            return false;
        }
        return true;
    });

    return <BriefListClient initialBriefs={filteredBriefs as any[]} workspaceId={workspaceId} />;
}
