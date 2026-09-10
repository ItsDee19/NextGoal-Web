-- Keep original source text for translation and retry; never assume old records are English.
ALTER TABLE "jobs"
  ADD COLUMN "original_title" TEXT,
  ADD COLUMN "original_description" TEXT,
  ADD COLUMN "original_location" TEXT,
  ADD COLUMN "source_language" TEXT,
  ADD COLUMN "translation_status" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "translation_fingerprint" TEXT,
  ADD COLUMN "translation_provider" TEXT,
  ADD COLUMN "translation_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "translation_error" TEXT,
  ADD COLUMN "translated_at" TIMESTAMP(3),
  ADD COLUMN "translation_next_retry_at" TIMESTAMP(3);

UPDATE "jobs" SET
  "original_title" = "title",
  "original_description" = "description",
  "original_location" = "location";

CREATE INDEX "jobs_is_active_translation_status_idx" ON "jobs"("is_active", "translation_status");
CREATE INDEX "jobs_translation_status_translation_next_retry_at_idx" ON "jobs"("translation_status", "translation_next_retry_at");

CREATE TABLE "job_translation_cache" (
  "fingerprint" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "location" TEXT,
  "source_language" TEXT,
  "provider" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "job_translation_cache_pkey" PRIMARY KEY ("fingerprint")
);
