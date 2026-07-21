-- AlterTable
ALTER TABLE "PulseEvent" ADD COLUMN     "senderType" TEXT;

-- CreateTable
CREATE TABLE "AgentInsight" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "agentType" TEXT NOT NULL DEFAULT 'brief_manager',
    "briefId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "messages" JSONB,
    "lastSignalAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "AgentInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentInsight_workspaceId_status_agentType_idx" ON "AgentInsight"("workspaceId", "status", "agentType");

-- CreateIndex
CREATE INDEX "AgentInsight_briefId_idx" ON "AgentInsight"("briefId");

-- AddForeignKey
ALTER TABLE "AgentInsight" ADD CONSTRAINT "AgentInsight_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentInsight" ADD CONSTRAINT "AgentInsight_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;
