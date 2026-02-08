-- SQL Script to link manual litigation entries to the ASCOLP workspace
-- Run this in your Supabase SQL Editor if you've entered data manually

-- 1. Identify the ASCOLP Workspace ID (verified from your DB)
-- ID: cmlbjb9lu0000hukzeod3zddo

-- 2. Link any orphan matters to ASCOLP
UPDATE "Matter"
SET "workspaceId" = 'cmlbjb9lu0000hukzeod3zddo'
WHERE "workspaceId" IS NULL OR "workspaceId" = '';

-- 3. Link any orphan CourtDates to their respective Matter/Brief/Client
-- Note: Required fields for CourtDate are matterId, briefId, and clientId.
-- If these are missing, the app will not display the records.

-- Example query to find orphan CourtDates:
SELECT id, date, "matterId", "briefId", "clientId"
FROM "CourtDate"
WHERE "matterId" IS NULL OR "briefId" IS NULL OR "clientId" IS NULL;

-- Once you have the correct project connected, these records should appear!
