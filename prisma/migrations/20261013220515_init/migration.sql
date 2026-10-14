-- CreateEnum
CREATE TYPE "GymSystem" AS ENUM ('ELEVATE', 'REDPOINT', 'ROCK_GYM_PRO');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('DESK', 'MANAGER', 'OWNER');

-- CreateEnum
CREATE TYPE "PassKind" AS ENUM ('DAY', 'PUNCH', 'MEMBERSHIP');

-- CreateEnum
CREATE TYPE "SignerRelation" AS ENUM ('SELF', 'PARENT', 'GUARDIAN');

-- CreateEnum
CREATE TYPE "CheckInMethod" AS ENUM ('SELF', 'FRONT_DESK', 'QR');

-- CreateTable
CREATE TABLE "Gym" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'America/Vancouver',
    "system" "GymSystem" NOT NULL DEFAULT 'ELEVATE',
    "waiverVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'DESK',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Climber" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "dateOfBirth" DATE NOT NULL,
    "authUserId" TEXT,
    "createdByStaffId" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Climber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pass" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "climberId" TEXT NOT NULL,
    "kind" "PassKind" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "visitsLeft" INTEGER,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Waiver" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "climberId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signedByName" TEXT NOT NULL,
    "signerRelation" "SignerRelation" NOT NULL DEFAULT 'SELF',
    "externalId" TEXT,

    CONSTRAINT "Waiver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "climberId" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "CheckInMethod" NOT NULL,
    "staffId" TEXT,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Gym_slug_key" ON "Gym"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_id_gymId_key" ON "Staff"("id", "gymId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_gymId_authUserId_key" ON "Staff"("gymId", "authUserId");

-- CreateIndex
CREATE INDEX "Climber_gymId_phone_idx" ON "Climber"("gymId", "phone");

-- CreateIndex
CREATE INDEX "Climber_gymId_email_idx" ON "Climber"("gymId", "email");

-- CreateIndex
CREATE INDEX "Climber_gymId_lastName_idx" ON "Climber"("gymId", "lastName");

-- CreateIndex
CREATE INDEX "Climber_authUserId_idx" ON "Climber"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Climber_id_gymId_key" ON "Climber"("id", "gymId");

-- CreateIndex
CREATE UNIQUE INDEX "Climber_gymId_externalId_key" ON "Climber"("gymId", "externalId");

-- CreateIndex
CREATE INDEX "Pass_gymId_climberId_expiresAt_idx" ON "Pass"("gymId", "climberId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Pass_gymId_externalId_key" ON "Pass"("gymId", "externalId");

-- CreateIndex
CREATE INDEX "Waiver_gymId_climberId_idx" ON "Waiver"("gymId", "climberId");

-- CreateIndex
CREATE UNIQUE INDEX "Waiver_gymId_externalId_key" ON "Waiver"("gymId", "externalId");

-- CreateIndex
CREATE INDEX "CheckIn_gymId_checkedInAt_idx" ON "CheckIn"("gymId", "checkedInAt");

-- CreateIndex
CREATE INDEX "CheckIn_climberId_checkedInAt_idx" ON "CheckIn"("climberId", "checkedInAt");

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Climber" ADD CONSTRAINT "Climber_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Climber" ADD CONSTRAINT "Climber_createdByStaffId_gymId_fkey" FOREIGN KEY ("createdByStaffId", "gymId") REFERENCES "Staff"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pass" ADD CONSTRAINT "Pass_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pass" ADD CONSTRAINT "Pass_climberId_gymId_fkey" FOREIGN KEY ("climberId", "gymId") REFERENCES "Climber"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Waiver" ADD CONSTRAINT "Waiver_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Waiver" ADD CONSTRAINT "Waiver_climberId_gymId_fkey" FOREIGN KEY ("climberId", "gymId") REFERENCES "Climber"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_climberId_gymId_fkey" FOREIGN KEY ("climberId", "gymId") REFERENCES "Climber"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_staffId_gymId_fkey" FOREIGN KEY ("staffId", "gymId") REFERENCES "Staff"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Gym" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Staff" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Climber" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pass" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Waiver" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CheckIn" ENABLE ROW LEVEL SECURITY;