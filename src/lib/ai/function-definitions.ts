// Function definitions for OpenAI function calling
// These define what actions Lex can perform

export const LEX_FUNCTIONS = [
    {
        name: 'get_matters_by_status',
        description: 'Get all matters filtered by status (active, closed, pending)',
        parameters: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    enum: ['active', 'closed', 'pending', 'all'],
                    description: 'Filter matters by status',
                },
                practiceArea: {
                    type: 'string',
                    description: 'Optional: Filter by practice area (Litigation, ADR, Corporate Advisory, etc.)',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of matters to return (default: 10)',
                },
            },
            required: ['status'],
        },
    },
    {
        name: 'create_matter',
        description: 'Create a new matter/case',
        parameters: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'Matter title (e.g., "Adeyemi v. State")',
                },
                clientName: {
                    type: 'string',
                    description: 'Client name',
                },
                practiceArea: {
                    type: 'string',
                    description: 'Practice area (Litigation, ADR, Corporate Advisory, etc.)',
                },
                status: {
                    type: 'string',
                    enum: ['active', 'pending', 'closed'],
                    description: 'Matter status',
                },
            },
            required: ['title', 'clientName', 'practiceArea'],
        },
    },
    {
        name: 'get_upcoming_deadlines',
        description: 'Get upcoming court dates and deadlines',
        parameters: {
            type: 'object',
            properties: {
                days: {
                    type: 'number',
                    description: 'Number of days to look ahead (default: 7)',
                },
                includeOverdue: {
                    type: 'boolean',
                    description: 'Include overdue items (default: true)',
                },
            },
        },
    },
    {
        name: 'record_expense',
        description: 'Record a new expense for the firm',
        parameters: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    enum: [
                        'Staff Salary',
                        'Office Rent',
                        'Utilities',
                        'Office Supplies',
                        'Transportation',
                        'Costs of Filing Processes',
                        'Office Repairs',
                        'Professional Development',
                        'Marketing',
                        'Other',
                    ],
                    description: 'Expense category',
                },
                amount: {
                    type: 'number',
                    description: 'Amount in Naira',
                },
                description: {
                    type: 'string',
                    description: 'Description of the expense',
                },
                reference: {
                    type: 'string',
                    description: 'Optional reference number or receipt ID',
                },
            },
            required: ['category', 'amount', 'description'],
        },
    },
    {
        name: 'get_expenses_summary',
        description: 'Get expense summary and analytics',
        parameters: {
            type: 'object',
            properties: {
                period: {
                    type: 'string',
                    enum: ['today', 'week', 'month', 'year'],
                    description: 'Time period for expense summary',
                },
                category: {
                    type: 'string',
                    description: 'Optional: Filter by specific category',
                },
            },
            required: ['period'],
        },
    },
    {
        name: 'search_documents',
        description: 'Search for documents and briefs',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query (document name, matter, or content)',
                },
                matterTitle: {
                    type: 'string',
                    description: 'Optional: Filter by matter title',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum results to return (default: 5)',
                },
            },
            required: ['query'],
        },
    },
    {
        name: 'get_client_communications',
        description: 'Get communication history with a client',
        parameters: {
            type: 'object',
            properties: {
                clientName: {
                    type: 'string',
                    description: 'Client name',
                },
                limit: {
                    type: 'number',
                    description: 'Number of recent communications to return (default: 5)',
                },
            },
            required: ['clientName'],
        },
    },
    {
        name: 'check_ndpa_compliance',
        description: 'Check NDPA compliance status for the firm',
        parameters: {
            type: 'object',
            properties: {
                detailed: {
                    type: 'boolean',
                    description: 'Return detailed compliance report (default: false)',
                },
            },
        },
    },
    {
        name: 'get_firm_analytics',
        description: 'Get firm performance analytics and insights',
        parameters: {
            type: 'object',
            properties: {
                metric: {
                    type: 'string',
                    enum: ['revenue', 'expenses', 'matters', 'productivity', 'overview'],
                    description: 'Type of analytics to retrieve',
                },
                period: {
                    type: 'string',
                    enum: ['week', 'month', 'quarter', 'year'],
                    description: 'Time period for analytics',
                },
            },
            required: ['metric', 'period'],
        },
    },
];

// Type definitions for function parameters
export interface GetMattersByStatusParams {
    status: 'active' | 'closed' | 'pending' | 'all';
    practiceArea?: string;
    limit?: number;
}

export interface CreateMatterParams {
    title: string;
    clientName: string;
    practiceArea: string;
    status?: 'active' | 'pending' | 'closed';
}

export interface GetUpcomingDeadlinesParams {
    days?: number;
    includeOverdue?: boolean;
}

export interface RecordExpenseParams {
    category: string;
    amount: number;
    description: string;
    reference?: string;
}

export interface GetExpensesSummaryParams {
    period: 'today' | 'week' | 'month' | 'year';
    category?: string;
}

export interface SearchDocumentsParams {
    query: string;
    matterTitle?: string;
    limit?: number;
}

export interface GetClientCommunicationsParams {
    clientName: string;
    limit?: number;
}

export interface CheckNDPAComplianceParams {
    detailed?: boolean;
}

export interface GetFirmAnalyticsParams {
    metric: 'revenue' | 'expenses' | 'matters' | 'productivity' | 'overview';
    period: 'week' | 'month' | 'quarter' | 'year';
}
