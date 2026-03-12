/**
 * Central TypeScript definitions for Reforma OS
 */

export type CalendarEventType = 'COURT_DATE' | 'FILING_DEADLINE' | 'CLIENT_MEETING' | 'INTERNAL_MEETING' | 'OTHER';

export interface ClientBriefSummary {
    id: string;
    briefNumber: string;
    name: string;
}

export interface ClientSummary {
    id: string;
    name: string;
    email?: string | null;
}

export interface CalendarEvent {
    id: string;
    date: Date;
    type: CalendarEventType;
    title: string | null;
    proceedings: string | null;
    adjournedFor: string | null;
    matterId: string | null;
    matter?: {
        id: string;
        caseNumber: string | null;
        name: string;
        client?: ClientSummary | null;
    } | null;
    appearances: LawyerSummary[];
}

export interface LawyerSummary {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
}

export interface MatterLawyerAssociation {
    lawyer: LawyerSummary;
    role: string;
}

export interface CalendarEntry {
    id: string;
    date: Date;
    type: CalendarEventType | string;
    title: string | null;
    proceedings?: string | null;
    adjournedFor?: string | null;
    location?: string | null;
    agenda?: string | null;
    judge?: string | null;
    externalCounsel?: string | null;
    appearances: LawyerSummary[];
}

export interface MeetingRecording {
    id: string;
    calendarEntryId: string | null;
    matterId: string | null;
    audioFileUrl: string | null;
    transcriptText: string | null;
    recordingDuration: number | null;
    createdById: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface Matter {
    id: string;
    workspaceId: string;
    caseNumber: string | null;
    name: string;
    court: string | null;
    judge: string | null;
    status: string;
    nextCourtDate: Date | null;
    client: ClientSummary;
    lawyers: MatterLawyerAssociation[];
    briefs: ClientBriefSummary[];
    calendarEntries?: CalendarEntry[];
    meetingRecordings?: MeetingRecording[];
    lastActivityAt?: Date;
    lastClientContact?: Date;
    createdAt?: Date;
}

export interface BankAccount {
    id: string;
    workspaceId: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    currency: string;
    createdAt: Date;
}

export interface InvoiceItem {
    id?: string;
    description: string;
    amount: number; // amount in kobo
    quantity: number;
    order?: number;
}

export interface Invoice {
    id: string;
    invoiceNumber: string;
    totalAmount: number; // in kobo
    paidAmount: number;  // in kobo
    status: string;
    dueDate: Date | null;
    createdAt: Date;
    items: InvoiceItem[];
    billToName: string;
    billToAddress?: string | null;
    billToCity?: string | null;
    billToState?: string | null;
    attentionTo?: string | null;
    notes?: string | null;
    client: {
        name: string;
    }
}
