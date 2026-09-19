-- AlterTable
ALTER TABLE "CallAttempt" ADD COLUMN     "generatedMediaUrl" TEXT;

-- AlterTable
ALTER TABLE "VoiceMessage" ADD COLUMN     "voiceProfileId" TEXT;

-- CreateTable
CREATE TABLE "VoiceProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "elevenLabsVoiceId" TEXT NOT NULL,
    "sampleMediaUrl" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoiceProfile_createdById_idx" ON "VoiceProfile"("createdById");

-- CreateIndex
CREATE INDEX "VoiceProfile_archivedAt_idx" ON "VoiceProfile"("archivedAt");

-- CreateIndex
CREATE INDEX "VoiceMessage_voiceProfileId_idx" ON "VoiceMessage"("voiceProfileId");

-- AddForeignKey
ALTER TABLE "VoiceProfile" ADD CONSTRAINT "VoiceProfile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceMessage" ADD CONSTRAINT "VoiceMessage_voiceProfileId_fkey" FOREIGN KEY ("voiceProfileId") REFERENCES "VoiceProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
