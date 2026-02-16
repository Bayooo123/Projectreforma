import { ExpenseCategory } from '@prisma/client';

export interface ExpenseInput {
    title?: string;
    description?: string;
    amount: number;
}

/**
 * Categorizes an expense based on its title and description using rule-based logic.
 */
export function categorizeExpense(input: ExpenseInput): ExpenseCategory {
    const text = `${input.title || ''} ${input.description || ''}`.toLowerCase();

    // 1. Court and Litigation Expenses
    if (text.match(/court|filing|legal|litigation|stamp duty|affidavit|service|motion|suit|tribunal/)) {
        return ExpenseCategory.COURT_LITIGATION;
    }

    // 2. Staff Costs, Salaries, Bonuses and Welfare
    if (text.match(/salary|bonus|welfare|allowance|stipend|staff|payroll|remuneration/)) {
        return ExpenseCategory.STAFF_COSTS;
    }

    // 3. Communication and Subscriptions
    if (text.match(/data|subscription|internet|airtime|phone|newspaper|journal|magazine|software/)) {
        return ExpenseCategory.COMMUNICATION_SUBSCRIPTIONS;
    }

    // 4. Vehicle and Administrative Logistics
    if (text.match(/vehicle|fuel|parking|diesel|petrol|car|taxi|uber|bolt|transport|logistics|travel/)) {
        // Note: The prompt says "non-court" for vehicle logistics, but litigation transport usually goes under court/litigation.
        // Our check for court/litigation already happens first.
        return ExpenseCategory.VEHICLE_LOGISTICS;
    }

    // 5. Office Utilities and Electrical Maintenance
    if (text.match(/bulb|circuit|electrical|power|nepa|phcn|utility|water|waste|generator|electrician/)) {
        return ExpenseCategory.OFFICE_UTILITIES;
    }

    // 6. Office Equipment Maintenance and Supplies
    if (text.match(/paper|stationery|ink|cartridge|printer|cleaning|repair|maintenance|furniture|office supply|janitorial/)) {
        return ExpenseCategory.OFFICE_EQUIPMENT_MAINTENANCE;
    }

    // 7. Non-Litigation / Advisory Related Expenses
    if (text.match(/advisory|meeting|regulatory|compliance|consultation|legal opinion|tax advisory/)) {
        return ExpenseCategory.NON_LITIGATION_ADVISORY;
    }

    // 8. Miscellaneous
    return ExpenseCategory.MISCELLANEOUS;
}
