-- AlterTable
ALTER TABLE "Pass" ADD COLUMN     "revokeReason" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "revokedById" TEXT;

-- AddForeignKey
ALTER TABLE "Pass" ADD CONSTRAINT "Pass_revokedById_gymId_fkey" FOREIGN KEY ("revokedById", "gymId") REFERENCES "Staff"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;
