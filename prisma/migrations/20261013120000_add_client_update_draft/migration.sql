-- CreateTable
CREATE TABLE "ClientUpdateDraft" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "calendarEntryId" TEXT NOT NULL,
    "draftText" TEXT NOT NULL,
    "finalText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "ClientUpdateDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientUpdateDraft_workspaceId_status_idx" ON "ClientUpdateDraft"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ClientUpdateDraft_matterId_idx" ON "ClientUpdateDraft"("matterId");

-- CreateIndex
CREATE INDEX "ClientUpdateDraft_calendarEntryId_idx" ON "ClientUpdateDraft"("calendarEntryId");

-- AddForeignKey
ALTER TABLE "ClientUpdateDraft" ADD CONSTRAINT "ClientUpdateDraft_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientUpdateDraft" ADD CONSTRAINT "ClientUpdateDraft_calendarEntryId_fkey" FOREIGN KEY ("calendarEntryId") REFERENCES "CalendarEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
