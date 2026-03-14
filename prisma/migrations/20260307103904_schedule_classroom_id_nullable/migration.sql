-- DropForeignKey
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_classroom_id_fkey";

-- AlterTable
ALTER TABLE "schedules" ALTER COLUMN "classroom_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
