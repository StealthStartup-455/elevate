-- CreateTable
CREATE TABLE "GymLabel" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClimberLabel" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "climberId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedById" TEXT,
    "removedAt" TIMESTAMP(3),
    "removedById" TEXT,

    CONSTRAINT "ClimberLabel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GymLabel_id_gymId_key" ON "GymLabel"("id", "gymId");

-- CreateIndex
CREATE UNIQUE INDEX "GymLabel_gymId_key_key" ON "GymLabel"("gymId", "key");

-- CreateIndex
CREATE INDEX "ClimberLabel_gymId_climberId_removedAt_idx" ON "ClimberLabel"("gymId", "climberId", "removedAt");

-- AddForeignKey
ALTER TABLE "GymLabel" ADD CONSTRAINT "GymLabel_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymLabel" ADD CONSTRAINT "GymLabel_createdById_gymId_fkey" FOREIGN KEY ("createdById", "gymId") REFERENCES "Staff"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClimberLabel" ADD CONSTRAINT "ClimberLabel_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClimberLabel" ADD CONSTRAINT "ClimberLabel_climberId_gymId_fkey" FOREIGN KEY ("climberId", "gymId") REFERENCES "Climber"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClimberLabel" ADD CONSTRAINT "ClimberLabel_labelId_gymId_fkey" FOREIGN KEY ("labelId", "gymId") REFERENCES "GymLabel"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClimberLabel" ADD CONSTRAINT "ClimberLabel_addedById_gymId_fkey" FOREIGN KEY ("addedById", "gymId") REFERENCES "Staff"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClimberLabel" ADD CONSTRAINT "ClimberLabel_removedById_gymId_fkey" FOREIGN KEY ("removedById", "gymId") REFERENCES "Staff"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security, like every other table: Supabase's public API can't read them.
ALTER TABLE "GymLabel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClimberLabel" ENABLE ROW LEVEL SECURITY;
