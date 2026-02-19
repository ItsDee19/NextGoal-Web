-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "last_verification_error" TEXT,
ADD COLUMN     "verification_attempts" INTEGER NOT NULL DEFAULT 0;
