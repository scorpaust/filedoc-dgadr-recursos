-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "thumbnailAlt" TEXT;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Tag_isActive_idx" ON "Tag"("isActive");
