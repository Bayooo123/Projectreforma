-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "DocumentEmbedding" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector,

    CONSTRAINT "DocumentEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentEmbedding_documentId_idx" ON "DocumentEmbedding"("documentId");

-- AddForeignKey
ALTER TABLE "DocumentEmbedding" ADD CONSTRAINT "DocumentEmbedding_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
