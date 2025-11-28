// Comprehensive function definitions for Lex AI Agent
// This enables Lex to perform ANY operation in Reforma

export const COMPREHENSIVE_LEX_FUNCTIONS = [
    // ============================================
    // MATTER MANAGEMENT
    // ============================================
    {
        name: 'get_matters',
        description: 'Get matters with optional filters',
        parameters: {
            type: 'object',
            properties: {
                status: { type: 'string', enum: ['active', 'closed', 'pending', 'all'] },
                practiceArea: { type: 'string' },
                assignedTo: { type: 'string', description: 'Lawyer name' },
                clientName: { type: 'string' },
                limit: { type: 'number', default: 10 },
            },
        },
    },
    {
        name: 'create_matter',
        description: 'Create a new matter/case',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Matter title' },
                clientName: { type: 'string' },
                practiceArea: { type: 'string' },
                status: { type: 'string', enum: ['active', 'pending', 'closed'], default: 'active' },
                assignedLawyer: { type: 'string', description: 'Lawyer name to assign' },
                description: { type: 'string' },
            },
            required: ['title', 'clientName', 'practiceArea'],
        },
    },
    {
        name: 'update_matter',
        description: 'Update an existing matter',
        parameters: {
            type: 'object',
            properties: {
                matterId: { type: 'string', description: 'Matter ID or number' },
                status: { type: 'string', enum: ['active', 'pending', 'closed'] },
                assignedLawyer: { type: 'string' },
                description: { type: 'string' },
            },
            required: ['matterId'],
        },
    },
    {
        name: 'delete_matter',
        description: 'Delete a matter (use with caution)',
        parameters: {
            type: 'object',
            properties: {
                matterId: { type: 'string' },
                confirm: { type: 'boolean', description: 'Must be true to confirm deletion' },
            },
            required: ['matterId', 'confirm'],
        },
    },
    {
        name: 'assign_matter_to_lawyer',
        description: 'Assign or reassign a matter to a lawyer',
        parameters: {
            type: 'object',
            properties: {
                matterId: { type: 'string' },
                lawyerName: { type: 'string' },
            },
            required: ['matterId', 'lawyerName'],
        },
    },

    // ============================================
    // CLIENT MANAGEMENT
    // ============================================
    {
        name: 'get_clients',
        description: 'Get all clients or search for specific clients',
        parameters: {
            type: 'object',
            properties: {
                searchQuery: { type: 'string', description: 'Search by name, email, or phone' },
                limit: { type: 'number', default: 10 },
            },
        },
    },
    {
        name: 'create_client',
        description: 'Add a new client to the system',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                address: { type: 'string' },
                type: { type: 'string', enum: ['individual', 'corporate'] },
            },
            required: ['name', 'email'],
        },
    },
    {
        name: 'update_client',
        description: 'Update client information',
        parameters: {
            type: 'object',
            properties: {
                clientId: { type: 'string', description: 'Client ID or name' },
                name: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                address: { type: 'string' },
            },
            required: ['clientId'],
        },
    },
    {
        name: 'delete_client',
        description: 'Delete a client and all associated data (NDPA right to erasure)',
        parameters: {
            type: 'object',
            properties: {
                clientId: { type: 'string' },
                confirm: { type: 'boolean', description: 'Must be true to confirm deletion' },
            },
            required: ['clientId', 'confirm'],
        },
    },
    {
        name: 'get_client_communications',
        description: 'Get communication history with a client',
        parameters: {
            type: 'object',
            properties: {
                clientName: { type: 'string' },
                limit: { type: 'number', default: 10 },
            },
            required: ['clientName'],
        },
    },
    {
        name: 'record_client_communication',
        description: 'Log a communication with a client',
        parameters: {
            type: 'object',
            properties: {
                clientName: { type: 'string' },
                type: { type: 'string', enum: ['email', 'phone', 'meeting', 'letter'] },
                subject: { type: 'string' },
                notes: { type: 'string' },
                date: { type: 'string', description: 'ISO date string' },
            },
            required: ['clientName', 'type', 'subject'],
        },
    },

    // ============================================
    // FINANCIAL OPERATIONS
    // ============================================
    {
        name: 'create_invoice',
        description: 'Create a new invoice for a client',
        parameters: {
            type: 'object',
            properties: {
                clientName: { type: 'string' },
                amount: { type: 'number', description: 'Amount in Naira' },
                description: { type: 'string', description: 'Invoice description/items' },
                dueDate: { type: 'string', description: 'ISO date string' },
                matterId: { type: 'string', description: 'Optional: Link to specific matter' },
            },
            required: ['clientName', 'amount', 'description'],
        },
    },
    {
        name: 'record_payment',
        description: 'Record a payment from a client',
        parameters: {
            type: 'object',
            properties: {
                clientName: { type: 'string' },
                amount: { type: 'number', description: 'Amount in Naira' },
                invoiceId: { type: 'string', description: 'Optional: Link to invoice' },
                method: { type: 'string', enum: ['cash', 'transfer', 'cheque', 'card'] },
                reference: { type: 'string', description: 'Payment reference/receipt number' },
                date: { type: 'string', description: 'ISO date string' },
            },
            required: ['clientName', 'amount', 'method'],
        },
    },
    {
        name: 'mark_invoice_paid',
        description: 'Mark an invoice as paid',
        parameters: {
            type: 'object',
            properties: {
                invoiceId: { type: 'string' },
                paymentReference: { type: 'string' },
            },
            required: ['invoiceId'],
        },
    },
    {
        name: 'record_expense',
        description: 'Record a firm expense',
        parameters: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    enum: [
                        'Staff Salary', 'Office Rent', 'Utilities', 'Office Supplies',
                        'Transportation', 'Costs of Filing Processes', 'Office Repairs',
                        'Professional Development', 'Marketing', 'Other'
                    ],
                },
                amount: { type: 'number', description: 'Amount in Naira' },
                description: { type: 'string' },
                reference: { type: 'string', description: 'Receipt/reference number' },
                date: { type: 'string', description: 'ISO date string' },
            },
            required: ['category', 'amount', 'description'],
        },
    },
    {
        name: 'get_expenses',
        description: 'Get expenses with filters and analytics',
        parameters: {
            type: 'object',
            properties: {
                period: { type: 'string', enum: ['today', 'week', 'month', 'year', 'custom'] },
                category: { type: 'string' },
                startDate: { type: 'string', description: 'For custom period' },
                endDate: { type: 'string', description: 'For custom period' },
                includeAnalytics: { type: 'boolean', default: true },
            },
            required: ['period'],
        },
    },
    {
        name: 'get_financial_summary',
        description: 'Get comprehensive financial summary (revenue, expenses, profit)',
        parameters: {
            type: 'object',
            properties: {
                period: { type: 'string', enum: ['week', 'month', 'quarter', 'year'] },
            },
            required: ['period'],
        },
    },

    // ============================================
    // DOCUMENT & BRIEF MANAGEMENT
    // ============================================
    {
        name: 'search_documents',
        description: 'Search for documents and briefs',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query' },
                matterTitle: { type: 'string', description: 'Filter by matter' },
                documentType: { type: 'string', description: 'e.g., motion, affidavit, brief' },
                limit: { type: 'number', default: 10 },
            },
            required: ['query'],
        },
    },
    {
        name: 'check_document_exists',
        description: 'Check if a specific document exists in the system',
        parameters: {
            type: 'object',
            properties: {
                documentName: { type: 'string' },
                matterTitle: { type: 'string', description: 'Optional: Narrow search to specific matter' },
            },
            required: ['documentName'],
        },
    },
    {
        name: 'upload_brief',
        description: 'Upload a new brief/document (requires file data)',
        parameters: {
            type: 'object',
            properties: {
                fileName: { type: 'string' },
                matterTitle: { type: 'string' },
                briefNumber: { type: 'string' },
                category: { type: 'string' },
                fileData: { type: 'string', description: 'Base64 encoded file or file path' },
            },
            required: ['fileName', 'matterTitle', 'fileData'],
        },
    },
    {
        name: 'delete_document',
        description: 'Delete a document/brief',
        parameters: {
            type: 'object',
            properties: {
                documentId: { type: 'string' },
                confirm: { type: 'boolean', description: 'Must be true to confirm' },
            },
            required: ['documentId', 'confirm'],
        },
    },
    {
        name: 'run_ocr_on_document',
        description: 'Run OCR processing on a document',
        parameters: {
            type: 'object',
            properties: {
                documentId: { type: 'string' },
            },
            required: ['documentId'],
        },
    },
    {
        name: 'get_pending_ocr_documents',
        description: 'Get all documents pending OCR processing',
        parameters: {
            type: 'object',
            properties: {},
        },
    },

    // ============================================
    // CALENDAR & DEADLINES
    // ============================================
    {
        name: 'get_upcoming_events',
        description: 'Get upcoming court dates, meetings, and deadlines',
        parameters: {
            type: 'object',
            properties: {
                days: { type: 'number', description: 'Days to look ahead', default: 7 },
                eventType: { type: 'string', enum: ['court', 'meeting', 'deadline', 'all'] },
                includeOverdue: { type: 'boolean', default: true },
            },
        },
    },
    {
        name: 'create_calendar_event',
        description: 'Add a new calendar event (court date, meeting, etc.)',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                type: { type: 'string', enum: ['court', 'meeting', 'deadline', 'other'] },
                date: { type: 'string', description: 'ISO datetime string' },
                location: { type: 'string' },
                matterId: { type: 'string', description: 'Optional: Link to matter' },
                description: { type: 'string' },
                reminderDays: { type: 'number', description: 'Days before to send reminder' },
            },
            required: ['title', 'type', 'date'],
        },
    },
    {
        name: 'update_calendar_event',
        description: 'Update or reschedule a calendar event',
        parameters: {
            type: 'object',
            properties: {
                eventId: { type: 'string' },
                newDate: { type: 'string', description: 'ISO datetime string' },
                newLocation: { type: 'string' },
                description: { type: 'string' },
            },
            required: ['eventId'],
        },
    },
    {
        name: 'delete_calendar_event',
        description: 'Delete a calendar event',
        parameters: {
            type: 'object',
            properties: {
                eventId: { type: 'string' },
                confirm: { type: 'boolean' },
            },
            required: ['eventId', 'confirm'],
        },
    },

    // ============================================
    // TASK MANAGEMENT
    // ============================================
    {
        name: 'create_task',
        description: 'Create a new task',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                assignedTo: { type: 'string', description: 'Lawyer name' },
                dueDate: { type: 'string', description: 'ISO date string' },
                priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                matterId: { type: 'string', description: 'Optional: Link to matter' },
            },
            required: ['title', 'assignedTo'],
        },
    },
    {
        name: 'get_tasks',
        description: 'Get tasks with filters',
        parameters: {
            type: 'object',
            properties: {
                assignedTo: { type: 'string' },
                status: { type: 'string', enum: ['pending', 'in-progress', 'completed', 'all'] },
                priority: { type: 'string' },
                overdue: { type: 'boolean', description: 'Show only overdue tasks' },
            },
        },
    },
    {
        name: 'update_task_status',
        description: 'Update task status',
        parameters: {
            type: 'object',
            properties: {
                taskId: { type: 'string' },
                status: { type: 'string', enum: ['pending', 'in-progress', 'completed'] },
            },
            required: ['taskId', 'status'],
        },
    },

    // ============================================
    // USER & WORKSPACE MANAGEMENT
    // ============================================
    {
        name: 'get_users',
        description: 'Get all users in the workspace',
        parameters: {
            type: 'object',
            properties: {
                role: { type: 'string', enum: ['owner', 'partner', 'lawyer', 'staff', 'all'] },
                active: { type: 'boolean', description: 'Filter by active status' },
            },
        },
    },
    {
        name: 'create_user',
        description: 'Add a new user to the workspace',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string', enum: ['partner', 'lawyer', 'staff'] },
            },
            required: ['name', 'email', 'role'],
        },
    },
    {
        name: 'update_user_role',
        description: 'Change a user\'s role',
        parameters: {
            type: 'object',
            properties: {
                userName: { type: 'string' },
                newRole: { type: 'string', enum: ['owner', 'partner', 'lawyer', 'staff'] },
            },
            required: ['userName', 'newRole'],
        },
    },
    {
        name: 'deactivate_user',
        description: 'Deactivate a user account',
        parameters: {
            type: 'object',
            properties: {
                userName: { type: 'string' },
                confirm: { type: 'boolean' },
            },
            required: ['userName', 'confirm'],
        },
    },

    // ============================================
    // NDPA COMPLIANCE
    // ============================================
    {
        name: 'check_ndpa_compliance',
        description: 'Check overall NDPA compliance status',
        parameters: {
            type: 'object',
            properties: {
                detailed: { type: 'boolean', default: false },
            },
        },
    },
    {
        name: 'generate_data_subject_report',
        description: 'Generate data subject access report (NDPA right to access)',
        parameters: {
            type: 'object',
            properties: {
                clientName: { type: 'string' },
                format: { type: 'string', enum: ['pdf', 'json', 'both'], default: 'both' },
            },
            required: ['clientName'],
        },
    },
    {
        name: 'check_consent_records',
        description: 'Check if consent records exist for clients',
        parameters: {
            type: 'object',
            properties: {
                clientName: { type: 'string', description: 'Optional: Check specific client' },
            },
        },
    },
    {
        name: 'prepare_breach_notification',
        description: 'Prepare NDPC breach notification templates',
        parameters: {
            type: 'object',
            properties: {
                affectedClients: { type: 'number', description: 'Number of affected clients' },
                dataTypes: { type: 'string', description: 'Types of data compromised' },
                incidentDate: { type: 'string', description: 'ISO date string' },
            },
            required: ['affectedClients', 'dataTypes', 'incidentDate'],
        },
    },

    // ============================================
    // ANALYTICS & REPORTING
    // ============================================
    {
        name: 'get_firm_analytics',
        description: 'Get comprehensive firm analytics',
        parameters: {
            type: 'object',
            properties: {
                metric: {
                    type: 'string',
                    enum: ['revenue', 'expenses', 'matters', 'productivity', 'overview'],
                },
                period: { type: 'string', enum: ['week', 'month', 'quarter', 'year'] },
                breakdown: { type: 'boolean', description: 'Include detailed breakdown', default: true },
            },
            required: ['metric', 'period'],
        },
    },
    {
        name: 'get_lawyer_workload',
        description: 'Analyze lawyer workload and productivity',
        parameters: {
            type: 'object',
            properties: {
                lawyerName: { type: 'string', description: 'Optional: Specific lawyer' },
            },
        },
    },
    {
        name: 'generate_report',
        description: 'Generate custom reports',
        parameters: {
            type: 'object',
            properties: {
                reportType: {
                    type: 'string',
                    enum: ['financial', 'matter-status', 'client-activity', 'expense-breakdown', 'custom'],
                },
                period: { type: 'string', enum: ['week', 'month', 'quarter', 'year', 'custom'] },
                startDate: { type: 'string', description: 'For custom period' },
                endDate: { type: 'string', description: 'For custom period' },
                format: { type: 'string', enum: ['pdf', 'csv', 'json'], default: 'pdf' },
            },
            required: ['reportType', 'period'],
        },
    },

    // ============================================
    // BULK OPERATIONS
    // ============================================
    {
        name: 'bulk_update_matters',
        description: 'Update multiple matters at once',
        parameters: {
            type: 'object',
            properties: {
                filter: {
                    type: 'object',
                    description: 'Filter criteria (e.g., {status: "pending", practiceArea: "Litigation"})',
                },
                updates: {
                    type: 'object',
                    description: 'Fields to update (e.g., {status: "active"})',
                },
                confirm: { type: 'boolean', description: 'Must be true to confirm bulk operation' },
            },
            required: ['filter', 'updates', 'confirm'],
        },
    },
    {
        name: 'bulk_delete_old_matters',
        description: 'Delete matters older than specified period (with NDPA compliance)',
        parameters: {
            type: 'object',
            properties: {
                olderThanYears: { type: 'number', description: 'Delete matters older than X years' },
                status: { type: 'string', enum: ['closed', 'all'], description: 'Only delete closed matters or all' },
                confirm: { type: 'boolean', description: 'Must be true to confirm' },
            },
            required: ['olderThanYears', 'confirm'],
        },
    },
    {
        name: 'send_bulk_client_updates',
        description: 'Send updates to multiple clients',
        parameters: {
            type: 'object',
            properties: {
                filter: { type: 'object', description: 'Client filter criteria' },
                message: { type: 'string', description: 'Message to send' },
                method: { type: 'string', enum: ['email', 'sms'], default: 'email' },
                confirm: { type: 'boolean' },
            },
            required: ['filter', 'message', 'confirm'],
        },
    },
];
