export function calculateComplianceDueDate(description: string, year: number = new Date().getFullYear()): Date | null {
    const desc = description.toLowerCase().trim();

    // Pattern: "31st March"
    const standardDateMatch = desc.match(/(\d+)(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)/);
    if (standardDateMatch) {
        const day = parseInt(standardDateMatch[1]);
        const monthStr = standardDateMatch[2];
        const monthIndex = new Date(`${monthStr} 1, 2000`).getMonth();
        return new Date(year, monthIndex, day);
    }

    // Pattern: "21st of every month" or "10th of every month"
    const monthlyMatch = desc.match(/(\d+)(?:st|nd|rd|th)?\s+of\s+every\s+month/);
    if (monthlyMatch) {
        const day = parseInt(monthlyMatch[1]);
        const now = new Date();
        const result = new Date(now.getFullYear(), now.getMonth(), day);
        // If the date has passed this month, set it for next month
        if (result < now) {
            result.setMonth(result.getMonth() + 1);
        }
        return result;
    }

    // Pattern: "7 days after salary payment" - Defaulting to 30th + 7 = 7th of next month for logic
    if (desc.includes('salary payment')) {
        const now = new Date();
        const result = new Date(now.getFullYear(), now.getMonth() + 1, 7);
        return result;
    }

    // Pattern: "last day of month"
    if (desc.includes('last day of month')) {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Pattern: "first quarter of the year"
    if (desc.includes('first quarter')) {
        return new Date(year, 2, 31); // End of Q1
    }

    return null;
}
