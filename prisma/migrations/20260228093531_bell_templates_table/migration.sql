/*
  Warnings:

  - You are about to drop the `BellTemplate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Schedule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_bellTemplateId_fkey";

-- DropTable
DROP TABLE "BellTemplate";

-- DropTable
DROP TABLE "Schedule";

-- CreateTable
CREATE TABLE "bell_templates" (
    "id" SERIAL NOT NULL,
    "institution_id" INTEGER NOT NULL,
    "group_id" INTEGER,
    "schedule_type" "ScheduleType" NOT NULL,
    "specific_date" TIMESTAMP(3),
    "weekday_start" INTEGER,
    "weekday_end" INTEGER,
    "lesson_number" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bell_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" SERIAL NOT NULL,
    "institution_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "classroom_id" INTEGER NOT NULL,
    "bell_template_id" INTEGER NOT NULL,
    "schedule_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bell_templates_group_id_schedule_type_specific_date_weekday_key" ON "bell_templates"("group_id", "schedule_type", "specific_date", "weekday_start", "weekday_end", "lesson_number");

-- CreateIndex
CREATE INDEX "schedules_group_id_schedule_date_idx" ON "schedules"("group_id", "schedule_date");

-- AddForeignKey
ALTER TABLE "bell_templates" ADD CONSTRAINT "bell_templates_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bell_templates" ADD CONSTRAINT "bell_templates_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_bell_template_id_fkey" FOREIGN KEY ("bell_template_id") REFERENCES "bell_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
