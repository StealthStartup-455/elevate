-- CreateEnum
CREATE TYPE "ShiftKind" AS ENUM ('DESK', 'COACHING', 'CLASS', 'SETTING', 'EVENT');

-- CreateTable
CREATE TABLE "StaffShift" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "kind" "ShiftKind" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "classId" TEXT,
    "eventId" TEXT,
    "setChangeId" TEXT,
    "note" TEXT,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffShift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffShift_gymId_startsAt_idx" ON "StaffShift"("gymId", "startsAt");

-- AddForeignKey
ALTER TABLE "StaffShift" ADD CONSTRAINT "StaffShift_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffShift" ADD CONSTRAINT "StaffShift_staffId_gymId_fkey" FOREIGN KEY ("staffId", "gymId") REFERENCES "Staff"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffShift" ADD CONSTRAINT "StaffShift_classId_gymId_fkey" FOREIGN KEY ("classId", "gymId") REFERENCES "GymClass"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffShift" ADD CONSTRAINT "StaffShift_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "GymEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffShift" ADD CONSTRAINT "StaffShift_setChangeId_fkey" FOREIGN KEY ("setChangeId") REFERENCES "SetChange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Like every other table: Supabase's public API can't read it. Prisma is not affected.
ALTER TABLE "StaffShift" ENABLE ROW LEVEL SECURITY;
