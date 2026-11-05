-- AlterTable
ALTER TABLE "Climber" ADD COLUMN     "accountUsername" TEXT;

-- CreateIndex
CREATE INDEX "Climber_gymId_accountUsername_idx" ON "Climber"("gymId", "accountUsername");
