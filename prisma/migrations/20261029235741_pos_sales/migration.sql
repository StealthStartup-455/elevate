-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('DAY', 'PUNCH', 'MEMBERSHIP', 'RENTAL', 'RETAIL');

-- CreateEnum
CREATE TYPE "Tender" AS ENUM ('CARD', 'CASH');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('PAID', 'VOIDED');

-- AlterTable
ALTER TABLE "Gym" ADD COLUMN     "taxRateBps" INTEGER NOT NULL DEFAULT 500;

-- AlterTable
ALTER TABLE "Pass" ADD COLUMN     "renews" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "saleLineId" TEXT;

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ProductKind" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "punches" INTEGER,
    "durationMonths" INTEGER,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "climberId" TEXT NOT NULL,
    "staffId" TEXT,
    "subtotalCents" INTEGER NOT NULL,
    "taxRateBps" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "tender" "Tender" NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'PAID',
    "idempotencyKey" TEXT NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleLine" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ProductKind" NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,

    CONSTRAINT "SaleLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_gymId_active_sortOrder_idx" ON "Product"("gymId", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Product_id_gymId_key" ON "Product"("id", "gymId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_gymId_name_key" ON "Product"("gymId", "name");

-- CreateIndex
CREATE INDEX "Sale_gymId_createdAt_idx" ON "Sale"("gymId", "createdAt");

-- CreateIndex
CREATE INDEX "Sale_climberId_createdAt_idx" ON "Sale"("climberId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_id_gymId_key" ON "Sale"("id", "gymId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_gymId_idempotencyKey_key" ON "Sale"("gymId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "SaleLine_saleId_idx" ON "SaleLine"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleLine_id_gymId_key" ON "SaleLine"("id", "gymId");

-- AddForeignKey
ALTER TABLE "Pass" ADD CONSTRAINT "Pass_saleLineId_gymId_fkey" FOREIGN KEY ("saleLineId", "gymId") REFERENCES "SaleLine"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_climberId_gymId_fkey" FOREIGN KEY ("climberId", "gymId") REFERENCES "Climber"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_staffId_gymId_fkey" FOREIGN KEY ("staffId", "gymId") REFERENCES "Staff"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLine" ADD CONSTRAINT "SaleLine_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLine" ADD CONSTRAINT "SaleLine_saleId_gymId_fkey" FOREIGN KEY ("saleId", "gymId") REFERENCES "Sale"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLine" ADD CONSTRAINT "SaleLine_productId_gymId_fkey" FOREIGN KEY ("productId", "gymId") REFERENCES "Product"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security, like every other table: Supabase's public API can't read them.
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleLine" ENABLE ROW LEVEL SECURITY;
