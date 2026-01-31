-- Add missing columns to CourtDate table to match Prisma schema
ALTER TABLE "CourtDate" 
ADD COLUMN IF NOT EXISTS "submittingLawyerId" TEXT,
ADD COLUMN IF NOT EXISTS "submittingLawyerToken" TEXT,
ADD COLUMN IF NOT EXISTS "submittingLawyerName" TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "CourtDate_submittingLawyerId_idx" ON "CourtDate"("submittingLawyerId");
