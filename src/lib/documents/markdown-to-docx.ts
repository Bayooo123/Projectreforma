import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

// Renders the Markdown DraftingService.generateDraft produces (see
// src/lib/drafting/prompts.ts: "#" titles, "##" section headers, "1. 2. 3."
// numbered paragraphs, "**bold**"/"*italic*" spans) into an actual .docx
// file. Not a general Markdown parser — only handles the small, predictable
// subset the drafting prompt is instructed to produce.

// Splits a line into TextRuns, honouring **bold** and *italic* spans.
function parseInline(line: string): TextRun[] {
    const runs: TextRun[] = [];
    const pattern = /(\*\*.+?\*\*|\*.+?\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(line)) !== null) {
        if (match.index > lastIndex) {
            runs.push(new TextRun(line.slice(lastIndex, match.index)));
        }
        const token = match[0];
        if (token.startsWith('**')) {
            runs.push(new TextRun({ text: token.slice(2, -2), bold: true }));
        } else {
            runs.push(new TextRun({ text: token.slice(1, -1), italics: true }));
        }
        lastIndex = pattern.lastIndex;
    }
    if (lastIndex < line.length) {
        runs.push(new TextRun(line.slice(lastIndex)));
    }
    return runs.length > 0 ? runs : [new TextRun('')];
}

export async function markdownToDocxBuffer(markdown: string, title?: string): Promise<Buffer> {
    const lines = markdown.split('\n');
    const children: Paragraph[] = [];

    for (const raw of lines) {
        const line = raw.trimEnd();

        if (line.startsWith('# ')) {
            children.push(new Paragraph({
                children: parseInline(line.slice(2)),
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 },
            }));
        } else if (line.startsWith('## ')) {
            children.push(new Paragraph({
                children: parseInline(line.slice(3)),
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 150 },
            }));
        } else if (line.trim().length === 0) {
            children.push(new Paragraph({ children: [], spacing: { after: 150 } }));
        } else {
            children.push(new Paragraph({
                children: parseInline(line),
                spacing: { after: 150 },
            }));
        }
    }

    const doc = new Document({
        sections: [{
            properties: { page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } } },
            children: children.length > 0 ? children : [new Paragraph('')],
        }],
        title,
    });

    return Packer.toBuffer(doc);
}
