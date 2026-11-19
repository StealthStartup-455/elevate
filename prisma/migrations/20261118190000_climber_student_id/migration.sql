-- Every climber gets a student ID ("V" and 8 digits) that their barcode holds (#38).
-- Climbers that already exist get a placeholder from the V9 range, numbered in
-- the order they joined, so the numbers are unique and can't be mistaken for
-- a real student number (those start V00). Staff can correct them on the
-- climber's page.
ALTER TABLE "Climber" ADD COLUMN "studentId" TEXT;

UPDATE "Climber" AS c
SET "studentId" = 'V' || lpad((90000000 + n.rn)::text, 8, '0')
FROM (
  SELECT "id", row_number() OVER (ORDER BY "createdAt", "id") AS rn
  FROM "Climber"
) AS n
WHERE c."id" = n."id";

ALTER TABLE "Climber" ALTER COLUMN "studentId" SET NOT NULL;

CREATE UNIQUE INDEX "Climber_gymId_studentId_key" ON "Climber"("gymId", "studentId");
