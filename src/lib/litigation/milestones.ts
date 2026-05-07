export type LitigationMilestoneType =
    | 'WRIT_ISSUED'
    | 'WRIT_SERVED'
    | 'STATEMENT_OF_CLAIM'
    | 'STATEMENT_OF_DEFENCE'
    | 'REPLY_TO_DEFENCE'
    | 'CLOSE_OF_PLEADINGS'
    | 'HEARING_NOTICE'
    | 'EXCHANGE_WITNESS_STATEMENTS'
    | 'EVIDENCE_HEARING'
    | 'FINAL_ADDRESSES'
    | 'JUDGMENT'
    | 'APPEAL_NOTICE'
    | 'APPEAL_BRIEF';

export type MilestonePhase = 'ORIGINATING' | 'PLEADINGS' | 'PRE_TRIAL' | 'TRIAL' | 'POST_TRIAL';

export interface MilestoneConfig {
    label: string;
    description: string;
    phase: MilestonePhase;
    /** Days after triggerMilestone completion before this milestone is due. null = court-set date. */
    deadlineDays: number | null;
    /** Days before dueDate to send a warning notification. */
    warnDays: number;
    /** Completing which milestone triggers deadline calculation for this one. */
    triggerMilestone: LitigationMilestoneType | null;
}

export const MILESTONE_CONFIG: Record<LitigationMilestoneType, MilestoneConfig> = {
    WRIT_ISSUED: {
        label: 'Writ of Summons Issued',
        description: 'Originating process filed at the court registry',
        phase: 'ORIGINATING',
        deadlineDays: null,
        warnDays: 7,
        triggerMilestone: null,
    },
    WRIT_SERVED: {
        label: 'Writ Served on Defendant',
        description: 'Court processes served on the defendant — triggers the pleadings timeline',
        phase: 'ORIGINATING',
        deadlineDays: 90,
        warnDays: 14,
        triggerMilestone: 'WRIT_ISSUED',
    },
    STATEMENT_OF_CLAIM: {
        label: 'Statement of Claim Filed',
        description: "Plaintiff's pleadings filed with the court within 21 days of service",
        phase: 'PLEADINGS',
        deadlineDays: 21,
        warnDays: 7,
        triggerMilestone: 'WRIT_SERVED',
    },
    STATEMENT_OF_DEFENCE: {
        label: 'Statement of Defence Filed',
        description: 'Defendant files defence within 30 days of service of statement of claim',
        phase: 'PLEADINGS',
        deadlineDays: 30,
        warnDays: 7,
        triggerMilestone: 'STATEMENT_OF_CLAIM',
    },
    REPLY_TO_DEFENCE: {
        label: 'Reply to Statement of Defence',
        description: 'Plaintiff files reply within 14 days of receiving defence',
        phase: 'PLEADINGS',
        deadlineDays: 14,
        warnDays: 5,
        triggerMilestone: 'STATEMENT_OF_DEFENCE',
    },
    CLOSE_OF_PLEADINGS: {
        label: 'Close of Pleadings',
        description: 'All pleadings exchanged; pleadings formally closed',
        phase: 'PLEADINGS',
        deadlineDays: 21,
        warnDays: 7,
        triggerMilestone: 'REPLY_TO_DEFENCE',
    },
    HEARING_NOTICE: {
        label: 'Hearing Notice Applied For',
        description: 'Application made for hearing notice to be issued by the court',
        phase: 'PRE_TRIAL',
        deadlineDays: 14,
        warnDays: 5,
        triggerMilestone: 'CLOSE_OF_PLEADINGS',
    },
    EXCHANGE_WITNESS_STATEMENTS: {
        label: 'Witness Statements Exchanged',
        description: 'Written statements on oath filed and exchanged between parties',
        phase: 'PRE_TRIAL',
        deadlineDays: 30,
        warnDays: 7,
        triggerMilestone: 'HEARING_NOTICE',
    },
    EVIDENCE_HEARING: {
        label: 'Evidence / Trial Hearing',
        description: 'Trial commenced — parties present evidence before the court',
        phase: 'TRIAL',
        deadlineDays: null,
        warnDays: 7,
        triggerMilestone: 'EXCHANGE_WITNESS_STATEMENTS',
    },
    FINAL_ADDRESSES: {
        label: 'Final Written Addresses Filed',
        description: 'Closing arguments and written addresses filed by all parties (21 days)',
        phase: 'TRIAL',
        deadlineDays: 21,
        warnDays: 5,
        triggerMilestone: 'EVIDENCE_HEARING',
    },
    JUDGMENT: {
        label: 'Judgment Delivered',
        description: 'Court delivers judgment — date set at court discretion',
        phase: 'TRIAL',
        deadlineDays: null,
        warnDays: 0,
        triggerMilestone: 'FINAL_ADDRESSES',
    },
    APPEAL_NOTICE: {
        label: 'Notice of Appeal Filed',
        description: 'Notice of appeal filed within 3 months of judgment (if applicable)',
        phase: 'POST_TRIAL',
        deadlineDays: 90,
        warnDays: 14,
        triggerMilestone: 'JUDGMENT',
    },
    APPEAL_BRIEF: {
        label: "Appellant's Brief Filed",
        description: "Appellant's brief filed within 60 days of record of appeal",
        phase: 'POST_TRIAL',
        deadlineDays: 60,
        warnDays: 14,
        triggerMilestone: 'APPEAL_NOTICE',
    },
};

export const MILESTONE_ORDER: LitigationMilestoneType[] = [
    'WRIT_ISSUED',
    'WRIT_SERVED',
    'STATEMENT_OF_CLAIM',
    'STATEMENT_OF_DEFENCE',
    'REPLY_TO_DEFENCE',
    'CLOSE_OF_PLEADINGS',
    'HEARING_NOTICE',
    'EXCHANGE_WITNESS_STATEMENTS',
    'EVIDENCE_HEARING',
    'FINAL_ADDRESSES',
    'JUDGMENT',
    'APPEAL_NOTICE',
    'APPEAL_BRIEF',
];

export const PHASE_LABELS: Record<MilestonePhase, string> = {
    ORIGINATING: 'Originating Process',
    PLEADINGS: 'Pleadings',
    PRE_TRIAL: 'Pre-Trial',
    TRIAL: 'Trial',
    POST_TRIAL: 'Post-Trial (Appeal)',
};

export const PHASE_ORDER: MilestonePhase[] = [
    'ORIGINATING',
    'PLEADINGS',
    'PRE_TRIAL',
    'TRIAL',
    'POST_TRIAL',
];
