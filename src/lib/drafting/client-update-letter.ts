import { completeText } from '@/lib/agents/ai-client';
import { SYSTEM_PROMPTS } from './prompts';

export type LetterFormat = 'formal' | 'memo';

export interface LetterClient {
    name: string;
    company?: string | null;
}

export interface LetterMatter {
    name: string;
    caseNumber?: string | null;
}

export interface LetterSignatory {
    name: string;
    jobTitle?: string | null;
}

// A client with a company on file is being updated in its institutional
// capacity (INEC, a bank) — those get the formal "Dear Sir/Madam, RE:"
// letter ASCOLP uses for institutions and corporate clients; everyone else
// (an individual, a trustee board) gets the "DATE/FROM/TO/SUBJECT" memo
// style — both seen across ASCOLP's real update letters.
export function determineLetterFormat(client: LetterClient): LetterFormat {
    return client.company ? 'formal' : 'memo';
}

function formatDate(d: Date): string {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function generateLetterBody(format: LetterFormat, context: string, instruction?: string): Promise<string> {
    const template = format === 'formal' ? SYSTEM_PROMPTS.CLIENT_UPDATE_LETTER_FORMAL : SYSTEM_PROMPTS.CLIENT_UPDATE_LETTER_MEMO;
    const prompt = template
        .replace('{{CONTEXT}}', context)
        .replace('{{INSTRUCTION}}', instruction || 'None — use your judgment on tone and detail.');

    return completeText({
        system: SYSTEM_PROMPTS.SENIOR_ASSOCIATE,
        prompt,
        tier: 'complex',
        maxTokens: 1536,
    });
}

export interface AssembledLetter {
    markdown: string;
    title: string;
    format: LetterFormat;
}

/**
 * Assembles a full client-update letter: the date, address/header block,
 * subject line, and closing/signature are built mechanically from real
 * records (never by the model); only the body — the narrative paragraphs —
 * is AI-generated, from generateLetterBody above.
 */
export async function assembleClientUpdateLetter(
    client: LetterClient,
    matter: LetterMatter,
    signatory: LetterSignatory,
    context: string,
    instruction?: string,
): Promise<AssembledLetter> {
    const format = determineLetterFormat(client);
    const body = await generateLetterBody(format, context, instruction);

    const date = formatDate(new Date());
    const subject = `UPDATE ON ${matter.name}${matter.caseNumber ? ` [${matter.caseNumber}]` : ''}`.toUpperCase();
    const signatoryBlock = signatory.jobTitle ? `${signatory.name}\n**${signatory.jobTitle}**` : signatory.name;

    const markdown = format === 'formal'
        ? [
            `**${date}**`,
            '',
            client.company,
            '',
            '**Dear Sir/Madam,**',
            '',
            `**RE: ${subject}**`,
            '',
            body,
            '',
            'Please accept the assurances of our highest professional regards.',
            '',
            'Yours faithfully,',
            '',
            '**FOR: ASCO LP**',
            '',
            signatoryBlock,
        ].join('\n')
        : [
            `**DATE: ${date}**`,
            '',
            '**FROM: ASCO LP**',
            '',
            `**TO: ${client.name}**`,
            '',
            `**SUBJECT: ${subject}**`,
            '',
            body,
            '',
            'Yours faithfully,',
            '',
            '**FOR: ASCO LP**',
            '',
            signatoryBlock,
        ].join('\n');

    return { markdown, title: subject, format };
}
