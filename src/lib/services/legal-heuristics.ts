/**
 * Legal Document Heuristics
 * Classifies legal documents based on substantive content from OCR/Text extraction.
 * Optimized for Nigerian legal terminology.
 */
export function classifyDocumentContent(text: string): string {
    const content = text.toLowerCase().substring(0, 5000); // Check first 5000 chars

    // 1. Court Orders / Judgments (High Priority)
    if (content.includes('it is hereby ordered') || content.includes('judgment') || content.includes('order of court')) {
        return 'Court Order';
    }
    
    if (content.includes('this court') && (content.includes('hereby rules') || content.includes('held as follows'))) {
        return 'Ruling';
    }

    // 2. Motions & Affidavits
    if (content.includes('motion on notice') || content.includes('motion ex-parte')) {
        return 'Motion';
    }
    
    if (content.includes('affidavit in support') || content.includes('counter-affidavit')) {
        return 'Affidavit';
    }

    // 3. Pleadings & Originating Processes
    if (content.includes('writ of summons') || content.includes('statement of claim') || content.includes('statement of defence')) {
        return 'Pleading'; // User said "there is no pleadings section", but we can tag it as such for metadata, or use "Court Process".
    }

    // 4. Briefs & Written Addresses
    if (content.includes('written address') || content.includes('brief of argument') || content.includes('final address')) {
        return 'Brief of Argument';
    }

    // 5. Legal Opinions
    if (content.includes('legal opinion') || content.includes('legal advice') || content.includes('re:') && content.includes('summary of instructions')) {
        return 'Legal Opinion';
    }

    // Default
    return 'Other Document';
}
