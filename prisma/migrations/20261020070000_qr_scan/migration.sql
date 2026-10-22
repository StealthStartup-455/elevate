-- CreateTable
CREATE TABLE "QrScan" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "climberId" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "takenAt" TIMESTAMP(3),

    CONSTRAINT "QrScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QrScan_gymId_takenAt_scannedAt_idx" ON "QrScan"("gymId", "takenAt", "scannedAt");

-- AddForeignKey
ALTER TABLE "QrScan" ADD CONSTRAINT "QrScan_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrScan" ADD CONSTRAINT "QrScan_climberId_gymId_fkey" FOREIGN KEY ("climberId", "gymId") REFERENCES "Climber"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security, like every other table: Supabase's public API can't read it.
ALTER TABLE "QrScan" ENABLE ROW LEVEL SECURITY;
