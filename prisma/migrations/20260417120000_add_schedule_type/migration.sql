-- CreateEnum
CREATE TYPE "ScheduleClassType" AS ENUM ('ONLINE', 'TEST', 'EXAM', 'DISTANCE');

-- AlterTable
ALTER TABLE "schedules"
ADD COLUMN "type" "ScheduleClassType";

-- Backfill existing дистанционные занятия
UPDATE "schedules"
SET "type" = 'DISTANCE'
WHERE "classroom_id" IS NULL
  AND "type" IS NULL;
