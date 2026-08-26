-- Generalize MeetingRecording: it no longer requires a CalendarEntry.
-- A recording can now be (a) tied to a CalendarEntry as before, (b) tied
-- directly to a Brief with no calendar entry, or (c) fully general — just
-- scoped to the workspace. workspaceId is added as a direct column (not
-- derived through calendarEntry) so case (c) has somewhere to attach.

-- AlterTable: add the new columns, nullable for now so existing rows are valid
ALTER TABLE "MeetingRecording" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "MeetingRecording" ADD COLUMN "briefId" TEXT;
ALTER TABLE "MeetingRecording" ADD COLUMN "title" TEXT;
ALTER TABLE "MeetingRecording" ALTER COLUMN "calendarEntryId" DROP NOT NULL;

-- Backfill workspaceId for existing rows from the CalendarEntry they're tied
-- to, via whichever of matter/brief/client that entry is linked to — same
-- resolution order as getMembershipForCalendarEntry in
-- src/app/actions/calendar-events.ts.
UPDATE "MeetingRecording" mr
SET "workspaceId" = COALESCE(m."workspaceId", b."workspaceId", c."workspaceId")
FROM "CalendarEntry" ce
LEFT JOIN "Matter" m ON m."id" = ce."matterId"
LEFT JOIN "Brief" b ON b."id" = ce."briefId"
LEFT JOIN "Client" c ON c."id" = ce."clientId"
WHERE mr."calendarEntryId" = ce."id" AND mr."workspaceId" IS NULL;

-- Any row that still has no workspaceId (a CalendarEntry with no
-- matter/brief/client link) can't be resolved automatically; there should be
-- none in practice, but this keeps the NOT NULL constraint below from
-- failing loudly instead of silently dropping data if one exists.
DELETE FROM "MeetingRecording" WHERE "workspaceId" IS NULL;

ALTER TABLE "MeetingRecording" ALTER COLUMN "workspaceId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "MeetingRecording_workspaceId_idx" ON "MeetingRecording"("workspaceId");
CREATE INDEX "MeetingRecording_briefId_idx" ON "MeetingRecording"("briefId");

-- AddForeignKey
ALTER TABLE "MeetingRecording" ADD CONSTRAINT "MeetingRecording_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingRecording" ADD CONSTRAINT "MeetingRecording_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE SET NULL ON UPDATE CASCADE;
