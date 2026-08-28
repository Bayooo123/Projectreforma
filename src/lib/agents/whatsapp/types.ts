export interface HistoryMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface PendingAttachmentContext {
    id: string;
    fileName: string;
    minutesAgo: number;
}

export interface AgentContext {
    fromNumber: string;
    workspaceId: string;
    userId: string;
    userName: string;
    firmName: string;
    // The most recent unfiled document this number sent, if any, and how
    // long ago — lets the model bind a bare "file it under X" that follows
    // shortly after to that specific document instead of guessing at
    // something else. See buildSystemPrompt/file_pending_document.
    pendingAttachment?: PendingAttachmentContext | null;
}
