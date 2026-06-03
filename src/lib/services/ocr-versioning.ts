/**
 * Content-Based Version Resolver
 * Determines if a new document is a version of an existing one purely by OCR substance.
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    // Tokenize and normalize
    const tokens1 = new Set(text1.toLowerCase().split(/\W+/).filter(t => t.length > 2));
    const tokens2 = new Set(text2.toLowerCase().split(/\W+/).filter(t => t.length > 2));

    if (tokens1.size === 0 || tokens2.size === 0) return 0;

    // Jaccard Similarity: Size of Interaction / Size of Union
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
}

/**
 * Checks if a document should be considered a new version.
 * Threshold: 0.85 (85% word overlap)
 */
export function isVersionOf(newText: string, existingText: string): boolean {
    const similarity = calculateTextSimilarity(newText, existingText);
    return similarity > 0.85;
}
