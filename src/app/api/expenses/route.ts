import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { notifyExpenseRecorded } from '@/lib/notifications';

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
        const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

        // Group by category
        const byCategory = expenses.reduce((acc, expense) => {
            if (!acc[expense.category]) {
                acc[expense.category] = 0;
            }
            acc[expense.category] += expense.amount;
            return acc;
        }, {} as Record<string, number>);

        // Group by date
        const byDate = expenses.reduce((acc, expense) => {
            const dateKey = expense.date.toISOString().split('T')[0];
            if (!acc[dateKey]) {
                acc[dateKey] = {
                    total: 0,
                    count: 0,
                    expenses: [],
                };
            }
            acc[dateKey].total += expense.amount;
            acc[dateKey].count += 1;
            acc[dateKey].expenses.push(expense);
            return acc;
        }, {} as Record<string, { total: number; count: number; expenses: any[] }>);

        return NextResponse.json({
            success: true,
            data: {
                expenses,
                aggregations: {
                    total: totalAmount,
                    count: expenses.length,
                    byCategory,
                    byDate,
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

// POST /api/expenses - Create a new expense
export async function POST(request: NextRequest) {
    try {
        await requireAuth();
        const body = await request.json();
        const { category, amount, description, date, reference, workspaceId } = body;

        // Validation
        if (!category || !amount || !description || !workspaceId) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const expense = await prisma.expense.create({
            data: {
                workspaceId,
                category,
                amount: Math.round(amount * 100), // Convert to kobo/cents
                description,
                date: date ? new Date(date) : new Date(),
                reference: reference || null,
            },
        });

        // Notify Managing Partners
        notifyExpenseRecorded(expense, workspaceId)
            .catch(err => console.error('Failed to notify partners:', err));

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
