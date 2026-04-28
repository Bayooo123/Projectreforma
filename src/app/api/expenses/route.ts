import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { notifyExpenseRecorded } from '@/lib/notifications';
import { categorizeExpense } from '@/lib/services/expense-classification';
import { ExpenseCategory, Prisma } from '@prisma/client';
import { logActivity } from '@/lib/log-activity';

// GET /api/expenses - Fetch expenses with optional filtering
export async function GET(request: NextRequest) {
    try {
        await requireAuth();
        const searchParams = request.nextUrl.searchParams;
        const filter = searchParams.get('filter'); // 'today' | 'this-month' | 'last-month' | 'date-range'
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const workspaceId = searchParams.get('workspaceId');

        if (!workspaceId) {
            return NextResponse.json(
                { success: false, error: 'Workspace ID is required' },
                { status: 400 }
            );
        }

        let dateFilter: any = {};

        if (filter === 'today') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            dateFilter = {
                date: {
                    gte: today,
                    lt: tomorrow,
                },
            };
        } else if (filter === 'this-month') {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

            dateFilter = {
                date: {
                    gte: firstDay,
                    lte: lastDay,
                },
            };
        } else if (filter === 'last-month') {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

            dateFilter = {
                date: {
                    gte: firstDay,
                    lte: lastDay,
                },
            };
        } else if (filter === 'date-range' && startDate && endDate) {
            dateFilter = {
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            };
        }

        const expenses = await prisma.expense.findMany({
            where: {
                workspaceId,
                ...dateFilter,
            },
            orderBy: {
                date: 'desc',
            },
        });

        // Calculate aggregations
        const totalAmount = expenses.reduce((sum, expense) => sum.plus(expense.amount), new Prisma.Decimal(0));

        // Group by category
        const byCategory = expenses.reduce((acc, expense) => {
            const cat = expense.category;
            if (!acc[cat]) {
                acc[cat] = new Prisma.Decimal(0);
            }
            acc[cat] = acc[cat].plus(expense.amount);
            return acc;
        }, {} as Record<string, Prisma.Decimal>);

        // Group by date
        const byDate = expenses.reduce((acc, expense) => {
            const dateKey = expense.date.toISOString().split('T')[0];
            if (!acc[dateKey]) {
                acc[dateKey] = {
                    total: new Prisma.Decimal(0),
                    count: 0,
                    expenses: [],
                };
            }
            acc[dateKey].total = acc[dateKey].total.plus(expense.amount);
            acc[dateKey].count += 1;
            acc[dateKey].expenses.push(expense);
            return acc;
        }, {} as Record<string, { total: Prisma.Decimal; count: number; expenses: any[] }>);

        return NextResponse.json({
            success: true,
            data: {
                expenses,
                aggregations: {
                    total: totalAmount.toString(),
                    count: expenses.length,
                    byCategory: Object.fromEntries(
                        Object.entries(byCategory).map(([k, v]) => [k, (v as Prisma.Decimal).toString()])
                    ),
                    byDate: Object.fromEntries(
                        Object.entries(byDate).map(([k, v]) => {
                            const val = v as { total: Prisma.Decimal; count: number; expenses: any[] };
                            return [k, { ...val, total: val.total.toString() }];
                        })
                    ),
                },
            },
        });
    } catch (error) {
        console.error('Error fetching expenses:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch expenses' },
            { status: 500 }
        );
    }
}

// POST /api/expenses - Create a new expense (single or batch)
export async function POST(request: NextRequest) {
    try {
        const authUser = await requireAuth();
        const body = await request.json();
        const { workspaceId, expenses, ...singleExpense } = body;

        // Validation
        if (!workspaceId) {
            return NextResponse.json(
                { success: false, error: 'Workspace ID is required' },
                { status: 400 }
            );
        }

        // Handle batch creation
        if (expenses && Array.isArray(expenses)) {
            if (expenses.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'No expenses provided' },
                    { status: 400 }
                );
            }

            // Create all expenses in a transaction
            const result = await prisma.$transaction(
                expenses.map((expense: any) => {
                    // Auto-categorize if category is missing or invalid
                    let finalCategory = expense.category as ExpenseCategory;
                    if (!Object.values(ExpenseCategory).includes(finalCategory)) {
                        finalCategory = categorizeExpense({
                            description: expense.description,
                            amount: typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount
                        });
                    }

                    return prisma.expense.create({
                        data: {
                            workspaceId,
                            category: finalCategory,
                            amount: new Prisma.Decimal(expense.amount), // Direct Decimal initialization
                            description: expense.description || null,
                            date: expense.date ? new Date(expense.date) : new Date(),
                            reference: expense.reference || null,
                        },
                    });
                })
            );

            // Notify Partners for each expense
            result.forEach(exp => {
                notifyExpenseRecorded(exp, workspaceId)
                    .catch(err => console.error('Failed to notify partners:', err));
            });

            if (authUser?.id) {
                logActivity({ workspaceId, userId: authUser.id, resource: 'EXPENSE', action: 'UPLOADED', resourceName: `${result.length} expense(s)` }).catch(() => {});
            }

            return NextResponse.json({
                success: true,
                data: result,
                count: result.length
            });
        }

        // Handle single creation (legacy support or single entry)
        let { category, amount, description, date, reference } = singleExpense;

        if (!amount) {
            return NextResponse.json(
                { success: false, error: 'Amount is required' },
                { status: 400 }
            );
        }

        // Auto-categorize if category is missing
        let finalCategory = category as ExpenseCategory;
        if (!category || !Object.values(ExpenseCategory).includes(finalCategory)) {
            finalCategory = categorizeExpense({
                description,
                amount: typeof amount === 'string' ? parseFloat(amount) : amount
            });
        }

        const expense = await prisma.expense.create({
            data: {
                workspaceId,
                category: finalCategory,
                amount: new Prisma.Decimal(amount), // Direct Decimal initialization
                description: description || null,
                date: date ? new Date(date) : new Date(),
                reference: reference || null,
            },
        });

        notifyExpenseRecorded(expense, workspaceId)
            .catch(err => console.error('Failed to notify partners:', err));

        if (authUser?.id) {
            logActivity({ workspaceId, userId: authUser.id, resource: 'EXPENSE', action: 'UPLOADED', resourceId: expense.id, resourceName: expense.description || `${expense.category} expense` }).catch(() => {});
        }

        return NextResponse.json({
            success: true,
            data: expense,
        });

    } catch (error) {
        console.error('Error creating expense:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create expense' },
            { status: 500 }
        );
    }
}

// PATCH /api/expenses - Update an expense
export async function PATCH(request: NextRequest) {
    try {
        const user = await requireAuth();
        const body = await request.json();
        const { id, workspaceId, category, amount, description, date, reference } = body;

        if (!id || !workspaceId) {
            return NextResponse.json(
                { success: false, error: 'Expense ID and Workspace ID are required' },
                { status: 400 }
            );
        }

        // 1. RBAC: Require MANAGE_OFFICE permission
        let membership;
        try {
            const { requirePermission } = await import('@/lib/auth-utils');
            membership = await requirePermission(workspaceId, 'MANAGE_OFFICE');
        } catch (error: any) {
             return NextResponse.json(
                { success: false, error: error.message },
                { status: 403 }
            );
        }

        const dbUserId = membership.userId;

        // 2. Fetch existing expense for audit log
        const existingExpense = await prisma.expense.findUnique({
            where: { id }
        });

        if (!existingExpense) {
            return NextResponse.json(
                { success: false, error: 'Expense not found' },
                { status: 404 }
            );
        }

        // 3. Update expense and log audit trail in a transaction
        const updatedExpense = await prisma.$transaction(async (tx) => {
            const updated = await tx.expense.update({
                where: { id },
                data: {
                    category: category as ExpenseCategory || undefined,
                    amount: amount !== undefined ? new Prisma.Decimal(amount) : undefined,
                    description: description !== undefined ? description : undefined,
                    date: date ? new Date(date) : undefined,
                    reference: reference !== undefined ? reference : undefined,
                },
            });

            // Create audit log
            await tx.expenseAuditLog.create({
                data: {
                    expenseId: id,
                    action: 'UPDATE',
                    changedBy: dbUserId,
                    oldData: existingExpense as any,
                    newData: updated as any,
                },
            });

            return updated;
        });

        return NextResponse.json({
            success: true,
            data: updatedExpense,
        });

    } catch (error: any) {
        console.error('Error updating expense:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to update expense',
                details: error.message 
            },
            { status: 500 }
        );
    }
}


// DELETE /api/expenses - Delete an expense
export async function DELETE(request: NextRequest) {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const workspaceId = searchParams.get('workspaceId');

        if (!id || !workspaceId) {
            return NextResponse.json(
                { success: false, error: 'Expense ID and Workspace ID are required' },
                { status: 400 }
            );
        }

        // 1. RBAC: Require MANAGE_OFFICE permission
        let membership;
        try {
            const { requirePermission } = await import('@/lib/auth-utils');
            membership = await requirePermission(workspaceId, 'MANAGE_OFFICE');
        } catch (error: any) {
             return NextResponse.json(
                { success: false, error: error.message },
                { status: 403 }
            );
        }

        const dbUserId = membership.userId;

        // 2. Fetch existing expense for audit log metadata before deletion
        const existingExpense = await prisma.expense.findUnique({
            where: { id }
        });

        if (!existingExpense) {
            return NextResponse.json(
                { success: false, error: 'Expense not found' },
                { status: 404 }
            );
        }

        // 3. Delete expense and log audit trail in a transaction
        await prisma.$transaction(async (tx) => {
            // Create audit log before deleting
            await tx.expenseAuditLog.create({
                data: {
                    expenseId: id,
                    action: 'DELETE',
                    changedBy: dbUserId,
                    oldData: existingExpense as any,
                    newData: undefined,
                },
            });

            // Perform the deletion
            await tx.expense.delete({
                where: { id },
            });
        });

        return NextResponse.json({
            success: true,
            message: 'Expense deleted successfully'
        });

    } catch (error: any) {
        console.error('Error deleting expense:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to delete expense',
                details: error.message 
            },
            { status: 500 }
        );
    }
}

