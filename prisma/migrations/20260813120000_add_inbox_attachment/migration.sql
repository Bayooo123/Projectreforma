-- CreateTable
CREATE TABLE "InboxAttachment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "caption" TEXT,
    "inboundEmailId" TEXT,
    "whatsappFromNumber" TEXT,
    "createdById" TEXT,
    "suggestedBriefId" TEXT,
    "suggestedConfidence" DOUBLE PRECISION,
    "suggestedReasoning" TEXT,
    "confirmedBriefId" TEXT,
    "documentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filedAt" TIMESTAMP(3),

    CONSTRAINT "InboxAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InboxAttachment_documentId_key" ON "InboxAttachment"("documentId");

-- CreateIndex
CREATE INDEX "InboxAttachment_workspaceId_status_idx" ON "InboxAttachment"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "InboxAttachment_source_idx" ON "InboxAttachment"("source");

-- CreateIndex
CREATE INDEX "InboxAttachment_inboundEmailId_idx" ON "InboxAttachment"("inboundEmailId");

-- AddForeignKey
ALTER TABLE "InboxAttachment" ADD CONSTRAINT "InboxAttachment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxAttachment" ADD CONSTRAINT "InboxAttachment_inboundEmailId_fkey" FOREIGN KEY ("inboundEmailId") REFERENCES "InboundEmail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxAttachment" ADD CONSTRAINT "InboxAttachment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxAttachment" ADD CONSTRAINT "InboxAttachment_suggestedBriefId_fkey" FOREIGN KEY ("suggestedBriefId") REFERENCES "Brief"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxAttachment" ADD CONSTRAINT "InboxAttachment_confirmedBriefId_fkey" FOREIGN KEY ("confirmedBriefId") REFERENCES "Brief"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxAttachment" ADD CONSTRAINT "InboxAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
