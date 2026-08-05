-- CreateTable
CREATE TABLE "IngestionSession" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "label" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "IngestionSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionCandidate" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "checksum" TEXT,
    "suggestedBriefId" TEXT,
    "confirmedBriefId" TEXT,
    "documentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "IngestionCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IngestionSession_tokenHash_key" ON "IngestionSession"("tokenHash");

-- CreateIndex
CREATE INDEX "IngestionSession_workspaceId_status_idx" ON "IngestionSession"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "IngestionSession_tokenHash_idx" ON "IngestionSession"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "IngestionCandidate_documentId_key" ON "IngestionCandidate"("documentId");

-- CreateIndex
CREATE INDEX "IngestionCandidate_sessionId_status_idx" ON "IngestionCandidate"("sessionId", "status");

-- CreateIndex
CREATE INDEX "IngestionCandidate_workspaceId_status_idx" ON "IngestionCandidate"("workspaceId", "status");

-- AddForeignKey
ALTER TABLE "IngestionSession" ADD CONSTRAINT "IngestionSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionSession" ADD CONSTRAINT "IngestionSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionCandidate" ADD CONSTRAINT "IngestionCandidate_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "IngestionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionCandidate" ADD CONSTRAINT "IngestionCandidate_suggestedBriefId_fkey" FOREIGN KEY ("suggestedBriefId") REFERENCES "Brief"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionCandidate" ADD CONSTRAINT "IngestionCandidate_confirmedBriefId_fkey" FOREIGN KEY ("confirmedBriefId") REFERENCES "Brief"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionCandidate" ADD CONSTRAINT "IngestionCandidate_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
