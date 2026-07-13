export interface HistoryMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface AgentContext {
    fromNumber: string;
    workspaceId: string;
    userId: string;
    userName: string;
    firmName: string;
}

export type AgentName = 'brief_manager' | 'calendar' | 'unknown';
