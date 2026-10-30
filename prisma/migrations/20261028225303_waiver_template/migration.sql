-- AlterTable
ALTER TABLE "Waiver" ADD COLUMN     "bodyHash" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "signatureImage" TEXT,
ADD COLUMN     "signatureText" TEXT,
ADD COLUMN     "signedByAuthUserId" TEXT,
ADD COLUMN     "templateId" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- CreateTable
CREATE TABLE "WaiverTemplate" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "clauses" TEXT[],
    "bodyHash" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaiverTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaiverTemplate_id_gymId_key" ON "WaiverTemplate"("id", "gymId");

-- CreateIndex
CREATE UNIQUE INDEX "WaiverTemplate_gymId_version_key" ON "WaiverTemplate"("gymId", "version");

-- AddForeignKey
ALTER TABLE "WaiverTemplate" ADD CONSTRAINT "WaiverTemplate_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Waiver" ADD CONSTRAINT "Waiver_templateId_gymId_fkey" FOREIGN KEY ("templateId", "gymId") REFERENCES "WaiverTemplate"("id", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security, like every other table: Supabase's public API can't read it.
ALTER TABLE "WaiverTemplate" ENABLE ROW LEVEL SECURITY;
