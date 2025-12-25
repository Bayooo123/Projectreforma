
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const results = [];

        // 1. Add "jobTitle" to User table
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "jobTitle" TEXT;`);
            results.push("✅ Added 'jobTitle' column to User table.");
        } catch (e: any) {
            results.push(`⚠️ Failed to add jobTitle: ${e.message}`);
        }

        // 2. Add "BankAccount" table (if it was missing too)
        try {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "BankAccount" (
                    "id" TEXT NOT NULL,
                    "workspaceId" TEXT NOT NULL,
                    "bankName" TEXT NOT NULL,
                    "accountNumber" TEXT NOT NULL,
                    "accountName" TEXT NOT NULL,
                    "currency" TEXT NOT NULL DEFAULT 'NGN',
                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" TIMESTAMP(3) NOT NULL,
                    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id"),
                    CONSTRAINT "BankAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
                );
            `);
            results.push("✅ Created 'BankAccount' table (if not exists).");
        } catch (e: any) {
            results.push(`⚠️ Failed to create BankAccount table: ${e.message}`);
        }

        // 3. Add 'letterheadUrl' to Workspace (saw it in schema, might be missing)
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "letterheadUrl" TEXT;`);
            results.push("✅ Added 'letterheadUrl' to Workspace table.");
        } catch (e: any) {
            results.push(`⚠️ Failed to add letterheadUrl: ${e.message}`);
        }

        return NextResponse.json({
            message: 'Schema Fix Attempted',
            results
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
