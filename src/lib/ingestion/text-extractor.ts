
import mammoth from 'mammoth';

// Use standard require for pdfjs-dist v3 legacy build
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf");

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
            } else if (mimeType.startsWith('image/')) {
                return await this.extractImage(buffer);
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
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            // Disable worker for Node usage or point to correct worker if needed
            // Legacy build usually handles this, but standard build might need standardFontDataUrl etc.
            isEvalSupported: false
        });
        const doc = await loadingTask.promise;

        let fullText = '';
        let extractedTextCount = 0;

        // 1. Try Standard Text Extraction
        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            fullText += pageText + '\n\n';
            extractedTextCount += pageText.trim().length;
        }

        // 2. Check if Scanned (Low text density)
        // Heuristic: Less than 50 characters of text per page average might indicate a scan
        // (or just mostly whitespace/garbage).
        const avgCharsPerPage = doc.numPages > 0 ? extractedTextCount / doc.numPages : 0;

        if (avgCharsPerPage < 50) {
            console.log(`[TextExtractor] Low text density (${avgCharsPerPage.toFixed(0)} chars/page). Attempting OCR...`);
            try {
                return await this.performOcrOnPdf(doc);
            } catch (ocrError) {
                console.error('[TextExtractor] OCR fallback failed:', ocrError);
                // Return whatever text we found, or indicate failure in text
                return fullText + '\n\n[OCR Failed to extract further text]';
            }
        }

        return fullText;
    }

    private static async performOcrOnPdf(doc: any): Promise<string> {
        // Import Canvas for Node environment
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { createCanvas } = require('canvas');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { createWorker } = require('tesseract.js');

        let fullOcrText = '';
        const worker = await createWorker('eng');

        try {
            for (let i = 1; i <= doc.numPages; i++) {
                console.log(`[TextExtractor] OCR Processing Page ${i}/${doc.numPages}...`);
                const page = await doc.getPage(i);

                // Set scale for better OCR accuracy (1.5 or 2.0)
                const viewport = page.getViewport({ scale: 1.5 });

                // Create Canvas
                const canvas = createCanvas(viewport.width, viewport.height);
                const context = canvas.getContext('2d');

                // Render PDF page to Canvas
                // polyfill requestAnimationFrame for pdf.js if needed (usually handled by canvas factory in newer versions, 
                // but explicit context passing works well in legacy)
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                // Convert Canvas to Buffer (PNG)
                const imageBuffer = canvas.toBuffer('image/png');

                // Tesseract
                const ret = await worker.recognize(imageBuffer);
                fullOcrText += ret.data.text + '\n\n';
            }
        } finally {
            await worker.terminate();
        }

        return fullOcrText;
    }

    private static async extractDocx(buffer: Buffer): Promise<string> {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }

    private static async extractImage(buffer: Buffer): Promise<string> {
        const { createWorker } = require('tesseract.js');
        const worker = await createWorker('eng');
        const ret = await worker.recognize(buffer);
        await worker.terminate();
        return ret.data.text;
    }
}
