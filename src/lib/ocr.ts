import Tesseract from 'tesseract.js';

export interface OCRResult {
    text: string;
    confidence: number;
    words: any[];
}

/**
 * Process a document file with OCR
 * @param file - The file to process (PDF, image, etc.)
 * @param onProgress - Optional callback for progress updates
 * @returns OCR result with extracted text and confidence
 */
export async function processDocumentOCR(
    file: File,
    onProgress?: (progress: number) => void
): Promise<OCRResult | null> {
    try {
        // Check file type
        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';

        if (!isImage && !isPDF) {
            console.log('Unsupported file type for OCR:', file.type);
            return null;
        }

        if (isPDF) {
            // For PDFs, we'd need to convert to images first
            // This is a simplified version - in production, use pdf.js to extract pages
            console.log('PDF OCR requires conversion to images first. Skipping for now.');
            // Return a mock result for PDFs to prevent UI errors during demo
            return {
                text: "PDF OCR is not fully implemented in this client-side demo. In production, this would use a server-side OCR service or pdf.js conversion.",
                confidence: 100,
                words: []
            };
        }

        // Run Tesseract OCR
        const result = await Tesseract.recognize(file, 'eng', {
            logger: (m) => {
                if (m.status === 'recognizing text' && onProgress) {
                    onProgress(Math.round(m.progress * 100));
                }
            },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = result.data as any;

        return {
            text: data.text,
            confidence: data.confidence,
            words: data.words || [],
        };
    } catch (error) {
        console.error('OCR processing error:', error);
        return null;
    }
}

/**
 * Detect if a document is likely scanned (image-based)
 * @param file - The file to check
 * @returns true if likely scanned
 */
export function isScannedDocument(file: File): boolean {
    // Simple check - in production, you'd analyze the PDF content
    return file.type.startsWith('image/') ||
        file.name.toLowerCase().includes('scan');
}

/**
 * Search for text within OCR results
 * @param query - Search query
 * @param ocrText - The OCR extracted text
 * @returns Array of matches with context
 */
export function searchInOCRText(query: string, ocrText: string) {
    const matches: Array<{
        index: number;
        text: string;
        context: string;
    }> = [];

    const regex = new RegExp(query, 'gi');
    let match;

    while ((match = regex.exec(ocrText)) !== null) {
        const contextStart = Math.max(0, match.index - 50);
        const contextEnd = Math.min(ocrText.length, match.index + query.length + 50);

        matches.push({
            index: match.index,
            text: match[0],
            context: ocrText.substring(contextStart, contextEnd),
        });
    }

    return matches;
}
