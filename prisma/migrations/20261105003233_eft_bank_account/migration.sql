-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "climberId" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "institutionNumber" TEXT NOT NULL,
    "transitNumber" TEXT NOT NULL,
    "accountLast4" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_id_gymId_key" ON "BankAccount"("id", "gymId");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_climberId_gymId_key" ON "BankAccount"("climberId", "gymId");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_climberId_gymId_fkey" FOREIGN KEY ("climberId", "gymId") REFERENCES "Climber"("id", "gymId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase's public API must not read bank details (prisma/DATABASE.md).
ALTER TABLE "BankAccount" ENABLE ROW LEVEL SECURITY;
