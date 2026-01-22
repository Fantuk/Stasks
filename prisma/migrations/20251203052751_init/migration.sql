-- AlterTable
ALTER TABLE "tokens" ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "tokens_pkey" PRIMARY KEY ("id");
