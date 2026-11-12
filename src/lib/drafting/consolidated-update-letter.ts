import { completeText } from '@/lib/agents/ai-client';
import { SYSTEM_PROMPTS } from './prompts';
import { determineLetterFormat, type LetterClient, type LetterFormat, type LetterSignatory } from './client-update-letter';

export interface ConsolidatedLeg {
    matterName: string;
    court?: string | null;
    caseNumber?: string | null;
    update: string;
}

function formatDate(d: Date): string {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Deliberately NOT the full letter-body prompt used for a single-matter
// update — that one expects to open and close a whole letter. Each leg
// here is one numbered section of a longer letter, so it gets the much
// lighter CONSOLIDATED_UPDATE_LEG prompt instead.
async function generateLegBody(leg: ConsolidatedLeg): Promise<string> {
    const context = [
        `Matter: ${leg.matterName}`,
        leg.court ? `Court: ${leg.court}` : null,
        leg.caseNumber ? `Suit number: ${leg.caseNumber}` : null,
        `What happened: ${leg.update}`,
    ].filter(Boolean).join('\n');

    const prompt = SYSTEM_PROMPTS.CONSOLIDATED_UPDATE_LEG.replace('{{CONTEXT}}', context);
    return completeText({ system: SYSTEM_PROMPTS.SENIOR_ASSOCIATE, prompt, tier: 'complex', maxTokens: 768 });
}

export interface AssembledConsolidatedLetter {
    markdown: string;
    title: string;
    format: LetterFormat;
}

/**
 * One letter, one recipient, one closing — a numbered "leg" per matter
 * instead of a separate letter per matter. The date, address block,
 * subject line, and closing/signature are assembled mechanically exactly
 * as in assembleClientUpdateLetter; only each leg's paragraph is AI-drafted.
 */
export async function assembleConsolidatedUpdateLetter(
    client: LetterClient,
    legs: ConsolidatedLeg[],
    signatory: LetterSignatory,
): Promise<AssembledConsolidatedLetter> {
    const format = determineLetterFormat(client);
    const date = formatDate(new Date());
    const subject = `UPDATE ON YOUR MATTERS WITH THE FIRM (${legs.length} MATTERS)`.toUpperCase();
    const signatoryBlock = signatory.jobTitle ? `${signatory.name}\n**${signatory.jobTitle}**` : signatory.name;

    const legBodies = await Promise.all(legs.map(generateLegBody));
    const legSections = legs
        .map((leg, i) => {
            const heading = [leg.matterName, leg.court].filter(Boolean).join(' — ');
            return `**${i + 1}.0** **${heading}**\n\n${legBodies[i]}`;
        })
        .join('\n\n');

    const intro = legs.length > 1
        ? `We write to update you on the following ${legs.length} matters we currently handle on your behalf.`
        : 'We write to update you on the following matter.';

    const markdown = format === 'formal'
        ? [
            `**${date}**`, '', client.company, '', '**Dear Sir/Madam,**', '', `**RE: ${subject}**`, '',
            intro, '', legSections, '',
            'Please accept the assurances of our highest professional regards.', '',
            'Yours faithfully,', '', '**FOR: ASCO LP**', '', signatoryBlock,
        ].join('\n')
        : [
            `**DATE: ${date}**`, '', '**FROM: ASCO LP**', '', `**TO: ${client.name}**`, '', `**SUBJECT: ${subject}**`, '',
            intro, '', legSections, '',
            'Yours faithfully,', '', '**FOR: ASCO LP**', '', signatoryBlock,
        ].join('\n');

    return { markdown, title: subject, format };
}
