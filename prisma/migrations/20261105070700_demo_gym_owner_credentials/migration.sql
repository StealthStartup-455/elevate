-- AlterTable
ALTER TABLE "Staff"
  ADD COLUMN "demoEmail" TEXT,
  ADD COLUMN "demoPasswordHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Staff_demoEmail_key" ON "Staff"("demoEmail");
