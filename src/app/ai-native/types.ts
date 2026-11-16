export type AgentKey = 'first_draft' | 'proofread' | 'standard_document' | 'deadline_watch' | 'ledger' | 'authority_search' | 'unclear' | 'instruction';

export const AGENT_LABELS: Record<AgentKey, string> = {
    first_draft: 'First Draft',
    proofread: 'Proofread',
    standard_document: 'Standard Documents',
    deadline_watch: 'Deadline Watch',
    ledger: 'Ledger',
    authority_search: 'Authority Search',
    unclear: 'Junior',
    instruction: 'Instruction',
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
    briefId: string;
    text: string;
    hint: string | null;
    brief?: { name: string };
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
}
