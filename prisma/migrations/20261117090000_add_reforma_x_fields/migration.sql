-- AlterTable
ALTER TABLE "User" ADD COLUMN "scn" TEXT;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "practiceFocus" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_scn_key" ON "User"("scn");
