"use client";

import { useState } from 'react';
import FinancialLog from "@/components/management/FinancialLog";
import AttendanceLogSection from "@/components/attendance/AttendanceLogSection";
import { ChevronDown, ChevronUp, TrendingDown } from 'lucide-react';

interface OfficeManagerClientProps {
    workspaceId: string;
    initialExpenses: any[];
    initialSummaries: any[];
    userRole: string;
    isOwner: boolean;
}

export default function OfficeManagerClient({
    workspaceId,
    initialExpenses,
    initialSummaries,
    userRole,
    isOwner
}: OfficeManagerClientProps) {
    const [expenseOpen, setExpenseOpen] = useState(true);

    return (
        <div className="max-w-[1400px] mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-primary mb-2">Office Management</h1>
                <p className="text-secondary dark:text-slate-400">Financial oversight and workspace configuration</p>
            </div>

            <div className="mt-8">
                {/* Collapsible petty cash / expense log */}
                <div style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: '#fff',
                }}>
                    <button
                        onClick={() => setExpenseOpen(o => !o)}
                        style={{
                            width: '100%',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.9rem 1.25rem',
                            background: expenseOpen ? '#fff' : '#f8fafc',
                            border: 'none', cursor: 'pointer',
                            borderBottom: expenseOpen ? '1px solid #e2e8f0' : 'none',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <TrendingDown size={16} color="#7c3aed" />
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>Petty Cash &amp; Expense Log</span>
                            {!expenseOpen && initialSummaries.length > 0 && (
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
                                    {initialSummaries.length} day{initialSummaries.length !== 1 ? 's' : ''} recorded this month
                                </span>
                            )}
                        </div>
                        {expenseOpen ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                    </button>

                    {expenseOpen && (
                        <div style={{ padding: '0.25rem 0' }}>
                            <FinancialLog
                                workspaceId={workspaceId}
                                initialExpenses={initialExpenses}
                                initialSummaries={initialSummaries}
                                userRole={userRole}
                                isOwner={isOwner}
                            />
                        </div>
                    )}
                </div>

                <AttendanceLogSection workspaceId={workspaceId} />
            </div>
        </div>
    );
}
