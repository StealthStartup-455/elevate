-- AlterTable
ALTER TABLE "GymLabel" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "ClimberLabel_climberId_labelId_key" ON "ClimberLabel"("climberId", "labelId");

