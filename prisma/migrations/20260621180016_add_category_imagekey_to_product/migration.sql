/*
  Warnings:

  - Added the required column `category` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "products" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN "image_key" TEXT;

ALTER TABLE "products" ALTER COLUMN "category" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_user_id_idx" ON "products"("user_id");
