/*
  Warnings:

  - You are about to drop the column `accountUsername` on the `Climber` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Climber_gymId_accountUsername_idx";

-- AlterTable
ALTER TABLE "Climber" DROP COLUMN "accountUsername";
