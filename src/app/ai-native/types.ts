import {
    PenLine, SpellCheck, FileText, CalendarClock, Receipt, Scale, Loader, BookMarked, FileSearch,
    FileCheck2, type LucideIcon,
} from 'lucide-react';

export type AgentKey = 'first_draft' | 'proofread' | 'standard_document' | 'deadline_watch' | 'ledger' | 'authority_search' | 'brief_status' | 'document_capture' | 'unclear' | 'instruction';

export const AGENT_LABELS: Record<AgentKey, string> = {
    first_draft: 'First Draft',
    proofread: 'Proofread',
    standard_document: 'Standard Documents',
    deadline_watch: 'Deadline Watch',
    ledger: 'Ledger',
    authority_search: 'Authority Search',
    brief_status: 'Brief Status',
    document_capture: 'Document Capture',
    unclear: 'Junior',
    instruction: 'Instruction',
};

/** The agents selectable from the sidebar's "Reforma(X)" submenu — the full suite minus the two internal, non-routable kinds (unclear/instruction). */
export const NAV_AGENTS: AgentKey[] = [
    'first_draft', 'proofread', 'standard_document', 'deadline_watch', 'ledger', 'brief_status', 'document_capture', 'authority_search',
];

/** Listed in the nav, but not yet backed by a real search — flagged "Soon" rather than presented as equally live. */
export const AGENT_COMING_SOON: Partial<Record<AgentKey, true>> = {
    authority_search: true,
};

export const AGENT_ICON: Record<AgentKey, LucideIcon> = {
    first_draft: PenLine, proofread: SpellCheck, standard_document: FileText,
    deadline_watch: CalendarClock, ledger: Receipt, authority_search: Scale,
    brief_status: FileSearch, document_capture: FileCheck2, unclear: Loader, instruction: BookMarked,
};

export interface BriefSummary {
    id: string;
    name: string;
    briefNumber: string;
    court: string | null;
    judge: string | null;
    nextDate: string | null;
    pending: boolean;
}

export interface LedgerEntry {
    id: string;
    description: string | null;
    amount: number;
    category: string;
    date: string;
}

export interface LedgerSummary {
    total: number;
    entries: LedgerEntry[];
}

export type RunStepView = [label: string, tone: 'live' | 'muted'];

export interface RunView {
    id: string;
    workspaceId: string;
    userId: string;
    briefId: string | null;
    agent: string;
    reason: string | null;
    input: string;
    kind: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- genuinely heterogeneous per run kind (facts/draft/ledger/gap)
    payload: any;
    steps: RunStepView[] | null;
    createdAt: string | Date;
    live: { draftText?: string; status?: string; edited?: boolean; gapStatus?: string; answer?: string | null } | null;
}

export interface GapView {
    id: string;
    briefId: string | null;
    text: string;
    hint: string | null;
    brief?: { name: string } | null;
}

export interface InstructionView {
    id: string;
    text: string;
    briefId: string | null;
    createdAt: string | Date;
    brief?: { name: string } | null;
}

export interface KnowledgeStatus {
    sources: { name: string; count: number }[];
    openGapCount: number;
    lastPassAt: string | null;
}

export interface AttentionCounts {
    total: number;
    byAgent: Partial<Record<AgentKey, number>>;
}
