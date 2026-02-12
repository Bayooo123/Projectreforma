/**
 * Brief Display Utilities
 * 
 * Helper functions for displaying brief metadata with proper fallbacks and overrides
 */

import { Brief, Matter } from '@prisma/client';

type BriefWithMatter = Brief & {
    matter?: Matter | null;
};

/**
 * Get the display title for a brief
 * 
 * Priority:
 * 1. Custom title (manual override)
 * 2. Matter name (for litigation-derived briefs)
 * 3. Brief name (fallback)
 * 
 * @param brief - The brief object
 * @returns The title to display
 */
export function getBriefDisplayTitle(brief: BriefWithMatter): string {
    // Manual override takes highest priority
    if (brief.customTitle) {
        return brief.customTitle;
    }

    // For litigation-derived briefs, dynamically pull from matter
    if (brief.isLitigationDerived && brief.matter) {
        return brief.matter.name;
    }

    // Fallback to stored name
    return brief.name;
}

/**
 * Get the display number for a brief
 * 
 * Priority:
 * 1. Custom brief number (firm's internal numbering)
 * 2. System-generated brief number
 * 
 * @param brief - The brief object
 * @returns The brief number to display
 */
export function getBriefDisplayNumber(brief: Brief): string {
    return brief.customBriefNumber || brief.briefNumber;
}

/**
 * Check if a brief title can be edited
 * 
 * Litigation-derived briefs should not have their base title edited,
 * but can have a custom override set.
 * 
 * @param brief - The brief object
 * @returns true if the title can be directly edited
 */
export function canEditBriefTitle(brief: Brief): boolean {
    // Can always set a custom override
    return true;
}

/**
 * Get the source description for a brief
 * 
 * @param brief - The brief object
 * @returns Human-readable source description
 */
export function getBriefSourceDescription(brief: BriefWithMatter): string {
    if (brief.isLitigationDerived && brief.matter) {
        return `Derived from litigation matter: ${brief.matter.caseNumber || 'N/A'}`;
    }

    return 'Standalone brief';
}

/**
 * Format brief metadata for display
 * 
 * @param brief - The brief object
 * @returns Formatted metadata object
 */
export function formatBriefMetadata(brief: BriefWithMatter) {
    return {
        title: getBriefDisplayTitle(brief),
        number: getBriefDisplayNumber(brief),
        source: getBriefSourceDescription(brief),
        isLitigationDerived: brief.isLitigationDerived,
        hasCustomTitle: !!brief.customTitle,
        hasCustomNumber: !!brief.customBriefNumber,
    };
}
