-- AlterEnum
ALTER TYPE "EvidenceType" ADD VALUE 'ocr';

-- AlterEnum
ALTER TYPE "FeedbackEntityType" ADD VALUE 'ingredient';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SourceType" ADD VALUE 'ocr';
ALTER TYPE "SourceType" ADD VALUE 'user_contribution';

-- AlterTable
ALTER TABLE "Dish" ADD COLUMN     "featured_rank" INTEGER,
ADD COLUMN     "is_famous" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "FeedbackReport" ADD COLUMN     "reporter_ref" TEXT;

-- CreateTable
CREATE TABLE "MenuItemIngredient" (
    "id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "source" "SourceType" NOT NULL DEFAULT 'user_submitted',
    "contributor_type" TEXT NOT NULL,
    "verification_status" TEXT NOT NULL DEFAULT 'unverified',
    "confidence" DECIMAL(3,2),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItemIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuItemIngredient_menu_item_id_idx" ON "MenuItemIngredient"("menu_item_id");

-- CreateIndex
CREATE INDEX "MenuItemIngredient_ingredient_id_idx" ON "MenuItemIngredient"("ingredient_id");

-- CreateIndex
CREATE INDEX "MenuItemIngredient_verification_status_idx" ON "MenuItemIngredient"("verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemIngredient_menu_item_id_ingredient_id_key" ON "MenuItemIngredient"("menu_item_id", "ingredient_id");

-- CreateIndex
CREATE INDEX "Dish_is_famous_featured_rank_idx" ON "Dish"("is_famous", "featured_rank");

-- AddForeignKey
ALTER TABLE "MenuItemIngredient" ADD CONSTRAINT "MenuItemIngredient_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "MenuItem"("menu_item_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemIngredient" ADD CONSTRAINT "MenuItemIngredient_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "Ingredient"("ingredient_id") ON DELETE CASCADE ON UPDATE CASCADE;
