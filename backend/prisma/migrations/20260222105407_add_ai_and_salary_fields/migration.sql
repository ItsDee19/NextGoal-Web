-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "ai_classified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "salary_currency" TEXT,
ADD COLUMN     "salary_max" INTEGER,
ADD COLUMN     "salary_min" INTEGER,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];
