-- AlterTable
ALTER TABLE "GymClass" ADD COLUMN     "classTypeId" TEXT;

-- CreateTable
CREATE TABLE "ClassType" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "details" TEXT,
    "instructor" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassType_id_gymId_key" ON "ClassType"("id", "gymId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassType_gymId_name_key" ON "ClassType"("gymId", "name");

-- CreateIndex
CREATE INDEX "GymClass_classTypeId_idx" ON "GymClass"("classTypeId");

-- AddForeignKey
ALTER TABLE "ClassType" ADD CONSTRAINT "ClassType_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClass" ADD CONSTRAINT "GymClass_classTypeId_gymId_fkey" FOREIGN KEY ("classTypeId", "gymId") REFERENCES "ClassType"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security, like every other table.
ALTER TABLE "ClassType" ENABLE ROW LEVEL SECURITY;
