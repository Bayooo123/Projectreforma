
'use server';

import { DraftingService } from '@/lib/drafting/drafting-service';

export async function generateDraftAction(briefId: string, instruction: string) {
    if (!briefId || !instruction) {
        return { error: 'Brief ID and Instruction are required.' };
    }

    try {
        const draft = await DraftingService.generateDraft(briefId, instruction);
        return { success: true, draft };
    } catch (error) {
        console.error('Error generating draft:', error);
        return { error: 'Failed to generate draft. Please try again.' };
    }
}
