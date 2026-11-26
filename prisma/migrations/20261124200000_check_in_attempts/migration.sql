-- CreateEnum
CREATE TYPE "CheckInSource" AS ENUM ('CAMERA', 'SEARCH', 'CLIMBER_PAGE');

-- CreateEnum
CREATE TYPE "CheckInOutcome" AS ENUM ('CHECKED_IN', 'REFUSED', 'GAVE_UP');

-- CreateTable
CREATE TABLE "CheckInAttempt" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "climberId" TEXT,
    "source" "CheckInSource" NOT NULL,
    "outcome" "CheckInOutcome" NOT NULL,
    "reason" TEXT,
    "wasBlocked" BOOLEAN NOT NULL DEFAULT false,
    "elapsedMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckInAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckInAttempt_gymId_createdAt_idx" ON "CheckInAttempt"("gymId", "createdAt");

-- AddForeignKey
ALTER TABLE "CheckInAttempt" ADD CONSTRAINT "CheckInAttempt_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
