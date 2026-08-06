-- AlterTable
ALTER TABLE "Brief" ADD COLUMN "manualStatus" TEXT,
ADD COLUMN "manualNextAction" TEXT,
ADD COLUMN "manualStatusUpdatedAt" TIMESTAMP(3),
ADD COLUMN "manualStatusUpdatedById" TEXT;

-- AddForeignKey
ALTER TABLE "Brief" ADD CONSTRAINT "Brief_manualStatusUpdatedById_fkey" FOREIGN KEY ("manualStatusUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
