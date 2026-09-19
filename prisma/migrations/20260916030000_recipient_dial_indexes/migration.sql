-- Dialer lookups skip locked recipients by due time; keep that path indexed.
CREATE INDEX "CampaignRecipient_nextAttemptAt_idx" ON "CampaignRecipient"("nextAttemptAt");
CREATE INDEX "CampaignRecipient_campaignId_status_nextAttemptAt_idx" ON "CampaignRecipient"("campaignId", "status", "nextAttemptAt");
