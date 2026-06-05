import { EmailIntent, EmailIntentType, UrgencyLevel, SenderType } from './email-processor';

/**
 * Deterministic Intent Classifier
 * Categorizes emails based on priority keywords.
 */
export function classifyIntentDeterministic(
    subject: string,
    body: string,
    sender: string
): EmailIntent {
    const text = `${subject} ${body}`.toLowerCase();
    
    let intent: EmailIntentType = 'CORRESPONDENCE';
    let urgency: UrgencyLevel = 'normal';
    let senderType: SenderType = 'other';

    // 1. Determine Sender Type
    if (sender.includes('.gov') || sender.includes('judiciary') || sender.includes('court')) {
        senderType = 'court';
    } else if (sender.includes('law') || sender.includes('legal') || sender.includes('solicitor')) {
        senderType = 'counsel';
    }

    // 2. Determine Intent & Urgency
    if (text.includes('adjourn') || text.includes('postpone') || text.includes('new date')) {
        intent = 'ADJOURNMENT';
        urgency = 'high';
    } else if (text.includes('payment') || text.includes('invoice') || text.includes('receipt') || text.includes('fee')) {
        intent = 'PAYMENT';
        urgency = 'high';
    } else if (text.includes('hearing') || text.includes('writ') || text.includes('summons') || text.includes('suit no')) {
        intent = 'COURT_NOTICE';
        urgency = 'critical';
    } else if (text.includes('attached') || text.includes('find herein') || text.includes('enclosed')) {
        intent = 'DOCUMENT_RECEIVED';
    } else if (text.includes('?') || text.includes('update') || text.includes('status')) {
        intent = 'CLIENT_QUERY';
    }

    return {
        intent,
        urgency,
        senderType,
        title: subject.substring(0, 80),
        summary: `Deterministic classification: ${intent} detected from keywords.`,
        actionItems: [`Review ${intent.toLowerCase().replace('_', ' ')} from ${sender}`]
    };
}
