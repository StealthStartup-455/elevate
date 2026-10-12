-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('DESK', 'MANAGER', 'OWNER');

-- CreateEnum
CREATE TYPE "SignupSource" AS ENUM ('SELF_SIGNUP', 'FRONT_DESK');

-- CreateEnum
CREATE TYPE "CheckInMethod" AS ENUM ('PIN', 'FRONT_DESK', 'QR');

-- CreateEnum
CREATE TYPE "CodeChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateTable
CREATE TABLE "Gym" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'America/Vancouver',
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
    "email" TEXT NOT NULL,
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
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "guardianConsentAt" TIMESTAMP(3),
    "signupSource" "SignupSource" NOT NULL,
    "createdByStaffId" TEXT,
    "authUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Climber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "climberId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "CheckInMethod" NOT NULL,
    "staffId" TEXT,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInCode" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "climberId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "channel" "CodeChannel" NOT NULL,
    "sentTo" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckInCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Gym_slug_key" ON "Gym"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_gymId_authUserId_key" ON "Staff"("gymId", "authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_gymId_email_key" ON "Staff"("gymId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Climber_authUserId_key" ON "Climber"("authUserId");

-- CreateIndex
CREATE INDEX "Climber_gymId_lastName_firstName_idx" ON "Climber"("gymId", "lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "Climber_gymId_email_key" ON "Climber"("gymId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Climber_gymId_phone_key" ON "Climber"("gymId", "phone");

-- CreateIndex
CREATE INDEX "CheckIn_gymId_timestamp_idx" ON "CheckIn"("gymId", "timestamp");

-- CreateIndex
CREATE INDEX "CheckIn_climberId_timestamp_idx" ON "CheckIn"("climberId", "timestamp");

-- CreateIndex
CREATE INDEX "CheckInCode_climberId_createdAt_idx" ON "CheckInCode"("climberId", "createdAt");

-- CreateIndex
CREATE INDEX "CheckInCode_gymId_expiresAt_idx" ON "CheckInCode"("gymId", "expiresAt");

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Climber" ADD CONSTRAINT "Climber_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Climber" ADD CONSTRAINT "Climber_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_climberId_fkey" FOREIGN KEY ("climberId") REFERENCES "Climber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInCode" ADD CONSTRAINT "CheckInCode_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInCode" ADD CONSTRAINT "CheckInCode_climberId_fkey" FOREIGN KEY ("climberId") REFERENCES "Climber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
