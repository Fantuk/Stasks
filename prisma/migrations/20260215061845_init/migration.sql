/*
  Warnings:

  - You are about to drop the `Classroom` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[institution_id,name]` on the table `groups` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[institution_id,name]` on the table `subjects` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Classroom" DROP CONSTRAINT "Classroom_floor_id_fkey";

-- DropIndex
DROP INDEX "groups_name_key";

-- DropIndex
DROP INDEX "subjects_name_key";

-- DropTable
DROP TABLE "Classroom";

-- CreateTable
CREATE TABLE "classrooms" (
    "id" SERIAL NOT NULL,
    "floor_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "groups_institution_id_name_key" ON "groups"("institution_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_institution_id_name_key" ON "subjects"("institution_id", "name");

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "floors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
