-- BC PST on the POS (PR #119 review). GST stays on every sale; PST is added
-- only for products that charge it (rentals and retail goods).

-- Rename the single tax rate to GST, now that there are two.
ALTER TABLE "Gym" RENAME COLUMN "taxRateBps" TO "gstRateBps";
ALTER TABLE "Gym" ADD COLUMN "pstRateBps" INTEGER NOT NULL DEFAULT 700;

ALTER TABLE "Product" ADD COLUMN "chargesPst" BOOLEAN NOT NULL DEFAULT false;
-- Rentals and retail goods already in the catalog charge PST.
UPDATE "Product" SET "chargesPst" = true WHERE "kind" IN ('RENTAL', 'RETAIL');

ALTER TABLE "Sale" RENAME COLUMN "taxRateBps" TO "gstRateBps";
ALTER TABLE "Sale" RENAME COLUMN "taxCents" TO "gstCents";
-- Sales made before this had no PST.
ALTER TABLE "Sale" ADD COLUMN "pstRateBps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "pstCents" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "SaleLine" ADD COLUMN "chargesPst" BOOLEAN NOT NULL DEFAULT false;
