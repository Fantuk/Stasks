-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "schedule_slot_id" TEXT;

-- CreateIndex
CREATE INDEX "schedules_schedule_slot_id_idx" ON "schedules"("schedule_slot_id");
