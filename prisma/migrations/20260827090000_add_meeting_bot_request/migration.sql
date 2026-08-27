-- Job queue for the local Zoom join-bot (zoom-bot/): a request to send the
-- bot into a meeting the firm doesn't host, so there's nothing for the
-- Cloud Recording webhook (recording.completed) to pick up. The bot process
-- runs outside this deployment (it has to stay connected as a participant
-- for the whole call, which Vercel's serverless functions can't do), so it
-- authenticates with an API key and polls/claims rows here instead of
-- receiving anything pushed to it.

-- CreateTable
CREATE TABLE "MeetingBotRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "briefId" TEXT,
    "meetingLink" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "recordingId" TEXT,
    "errorMessage" TEXT,
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MeetingBotRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingBotRequest_workspaceId_idx" ON "MeetingBotRequest"("workspaceId");
CREATE INDEX "MeetingBotRequest_status_idx" ON "MeetingBotRequest"("status");

-- AddForeignKey
ALTER TABLE "MeetingBotRequest" ADD CONSTRAINT "MeetingBotRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingBotRequest" ADD CONSTRAINT "MeetingBotRequest_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MeetingBotRequest" ADD CONSTRAINT "MeetingBotRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
