
export class Chunker {

    private static MAX_CHUNK_SIZE = 1500; // Characters (~300-400 tokens)
    private static OVERLAP = 200; // Characters overlap to maintain context

    /**
     * Splits raw text into overlapping chunks suitable for embedding.
     * Uses naive splitting by double newline (paragraphs) first, then merges/splits to fit size.
     */
    static chunk(text: string): string[] {
        // 1. Clean text (remove excessive newlines/spaces)
        const cleanText = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');

        // 2. Split by logical paragraphs (double newlines are often legal paragraphs)
        const rawParagraphs = cleanText.split('\n\n');

        const finalChunks: string[] = [];
        let currentChunk = '';

        for (const paragraph of rawParagraphs) {
            const cleanPara = paragraph.trim();
            if (!cleanPara) continue;

            // If adding this paragraph exceeds chunk size, push current and start new
            if (currentChunk.length + cleanPara.length > this.MAX_CHUNK_SIZE) {
                if (currentChunk) {
                    finalChunks.push(currentChunk);
                    // Start new chunk with overlap from end of previous (simple approach: just start fresh for now)
                    // Advanced: We could take the last N chars. For legal, paragraph boundary is usually improved context.
                    currentChunk = '';
                }

                // If paragraph itself is huge, force split it
                if (cleanPara.length > this.MAX_CHUNK_SIZE) {
                    const fragments = this.forceSplit(cleanPara, this.MAX_CHUNK_SIZE);
                    finalChunks.push(...fragments);
                } else {
                    currentChunk = cleanPara;
                }
            } else {
                // Determine separator (space or newline)
                const separator = currentChunk ? '\n\n' : '';
                currentChunk += separator + cleanPara;
            }
        }

        // Push remaining
        if (currentChunk) {
            finalChunks.push(currentChunk);
        }

        return finalChunks;
    }

    private static forceSplit(text: string, size: number): string[] {
        const chunks = [];
        for (let i = 0; i < text.length; i += size) {
            chunks.push(text.substring(i, i + size));
        }
        return chunks;
    }
}
