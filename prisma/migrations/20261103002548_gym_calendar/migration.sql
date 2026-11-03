-- CreateTable
CREATE TABLE "OpeningHours" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "opensAt" INTEGER NOT NULL,
    "closesAt" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpeningHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialHours" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "opensAt" INTEGER,
    "closesAt" INTEGER,
    "note" TEXT,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymEvent" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetChange" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "wall" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymClass" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "instructor" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassBooking" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "climberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "ClassBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OpeningHours_gymId_weekday_key" ON "OpeningHours"("gymId", "weekday");

-- CreateIndex
CREATE INDEX "SpecialHours_gymId_date_idx" ON "SpecialHours"("gymId", "date");

-- CreateIndex
CREATE INDEX "GymEvent_gymId_startsAt_idx" ON "GymEvent"("gymId", "startsAt");

-- CreateIndex
CREATE INDEX "SetChange_gymId_startsAt_idx" ON "SetChange"("gymId", "startsAt");

-- CreateIndex
CREATE INDEX "GymClass_gymId_startsAt_idx" ON "GymClass"("gymId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "GymClass_id_gymId_key" ON "GymClass"("id", "gymId");

-- CreateIndex
CREATE INDEX "ClassBooking_gymId_climberId_idx" ON "ClassBooking"("gymId", "climberId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassBooking_classId_climberId_key" ON "ClassBooking"("classId", "climberId");

-- AddForeignKey
ALTER TABLE "OpeningHours" ADD CONSTRAINT "OpeningHours_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialHours" ADD CONSTRAINT "SpecialHours_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymEvent" ADD CONSTRAINT "GymEvent_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetChange" ADD CONSTRAINT "SetChange_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClass" ADD CONSTRAINT "GymClass_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassBooking" ADD CONSTRAINT "ClassBooking_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassBooking" ADD CONSTRAINT "ClassBooking_classId_gymId_fkey" FOREIGN KEY ("classId", "gymId") REFERENCES "GymClass"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassBooking" ADD CONSTRAINT "ClassBooking_climberId_gymId_fkey" FOREIGN KEY ("climberId", "gymId") REFERENCES "Climber"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security, like every other table, so Supabase's public API can't
-- read them. Prisma is not affected.
ALTER TABLE "OpeningHours" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SpecialHours" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GymEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SetChange" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GymClass" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassBooking" ENABLE ROW LEVEL SECURITY;
