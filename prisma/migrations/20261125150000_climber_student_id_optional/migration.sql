-- A climber who is not a student has no V number (#245). The unique index stays: Postgres allows many NULLs.
ALTER TABLE "Climber" ALTER COLUMN "studentId" DROP NOT NULL;
