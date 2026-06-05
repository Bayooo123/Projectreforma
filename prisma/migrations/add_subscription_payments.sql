-- Add subscription fields to Workspace
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "subscriptionBand" TEXT;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "subscriptionTier" TEXT;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt" TIMESTAMP(3);
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "subscriptionStartedAt" TIMESTAMP(3);

-- Create SubscriptionPayment table
CREATE TABLE IF NOT EXISTS "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "band" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "paymentReference" TEXT NOT NULL,
    "monnifyReference" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SubscriptionPayment_paymentReference_key" UNIQUE ("paymentReference"),
    CONSTRAINT "SubscriptionPayment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SubscriptionPayment_workspaceId_idx" ON "SubscriptionPayment"("workspaceId");
CREATE INDEX IF NOT EXISTS "SubscriptionPayment_paymentReference_idx" ON "SubscriptionPayment"("paymentReference");
