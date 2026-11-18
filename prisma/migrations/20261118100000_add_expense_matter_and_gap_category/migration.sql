-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "matterId" TEXT;

-- CreateIndex
CREATE INDEX "Expense_matterId_idx" ON "Expense"("matterId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "KnowledgeGap" ALTER COLUMN "briefId" DROP NOT NULL;
