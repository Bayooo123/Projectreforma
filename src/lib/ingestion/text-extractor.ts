
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

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
        const data = await pdf(buffer);
        return data.text;
    }

    private static async extractDocx(buffer: Buffer): Promise<string> {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }
}
