
import mammoth from 'mammoth';

// Use standard require for pdfjs-dist legacy build (Node.js compatible)
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

export class TextExtractor {

    /**
     * Extracts text from a File buffer based on MIME type.
     */
    static async extract(buffer: Buffer, mimeType: string): Promise<string> {
        try {
            if (mimeType === 'application/pdf') {
                return await this.extractPdf(buffer);
            } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                return await this.extractDocx(buffer);
            } else if (mimeType.startsWith('text/')) {
                return buffer.toString('utf-8');
            } else {
                throw new Error(`Unsupported file type: ${mimeType}`);
            }
        } catch (error) {
            console.error('[TextExtractor] Error extracting text:', error);
            throw new Error(`Failed to extract text from file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private static async extractPdf(buffer: Buffer): Promise<string> {
        // Load the PDF file
        const uint8Array = new Uint8Array(buffer);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const doc = await loadingTask.promise;

        let fullText = '';

        // Iterate through each page
        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();

            // Extract text items
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            fullText += pageText + '\n\n';
        }

        return fullText;
    }

    private static async extractDocx(buffer: Buffer): Promise<string> {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }
}
