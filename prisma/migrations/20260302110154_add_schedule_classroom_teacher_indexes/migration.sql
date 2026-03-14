-- CreateIndex
CREATE INDEX "schedules_classroom_id_schedule_date_idx" ON "schedules"("classroom_id", "schedule_date");

-- CreateIndex
CREATE INDEX "schedules_teacher_id_schedule_date_idx" ON "schedules"("teacher_id", "schedule_date");
