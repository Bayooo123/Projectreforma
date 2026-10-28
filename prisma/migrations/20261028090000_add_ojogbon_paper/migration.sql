-- Ojogbon: papers written in the writing studio (one JSON document per paper).
-- Additive only: creates a new table, touches nothing that exists.

-- CreateTable
CREATE TABLE "OjogbonPaper" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OjogbonPaper_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OjogbonPaper_userId_updatedAt_idx" ON "OjogbonPaper"("userId", "updatedAt");
