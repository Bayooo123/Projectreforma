-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "firmCode" TEXT,
ADD COLUMN     "joinPassword" TEXT;

-- AlterTable
ALTER TABLE "WorkspaceMember" ADD COLUMN     "designation" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_firmCode_key" ON "Workspace"("firmCode");
