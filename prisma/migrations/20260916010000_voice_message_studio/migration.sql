-- AlterTable
ALTER TABLE "VoiceMessage" ADD COLUMN "fileSizeBytes" INTEGER;
ALTER TABLE "VoiceMessage" ADD COLUMN "archivedAt" TIMESTAMP(3);
