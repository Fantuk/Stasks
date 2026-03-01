-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('date', 'weekday');

-- CreateTable
CREATE TABLE "BellTemplate" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER,
    "scheduleType" "ScheduleType" NOT NULL,
    "specificDate" TIMESTAMP(3),
    "weekdayStart" INTEGER,
    "weekdayEnd" INTEGER,
    "lessonNumber" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BellTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" SERIAL NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "classroomId" INTEGER NOT NULL,
    "bellTemplateId" INTEGER NOT NULL,
    "scheduleDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BellTemplate_groupId_scheduleType_specificDate_weekdayStart_key" ON "BellTemplate"("groupId", "scheduleType", "specificDate", "weekdayStart", "weekdayEnd", "lessonNumber");

-- CreateIndex
CREATE INDEX "Schedule_groupId_scheduleDate_idx" ON "Schedule"("groupId", "scheduleDate");

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_bellTemplateId_fkey" FOREIGN KEY ("bellTemplateId") REFERENCES "BellTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
