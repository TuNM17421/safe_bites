-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "can_customize" TEXT DEFAULT 'unknown',
ADD COLUMN     "customization_notes" TEXT,
ADD COLUMN     "ingredient_notes" TEXT,
ADD COLUMN     "shared_cookware" TEXT DEFAULT 'unknown',
ADD COLUMN     "shared_fryer" TEXT DEFAULT 'unknown';

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "operator" TEXT,
ADD COLUMN     "slug" TEXT;

-- CreateTable
CREATE TABLE "MenuItemAllergenStatus" (
    "id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "allergen_id" TEXT NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "confidence" DECIMAL(3,2) NOT NULL,
    "source" TEXT NOT NULL,
    "reason_en" TEXT NOT NULL,
    "reason_vi" TEXT,
    "last_verified_at" TIMESTAMP(3),
    "verification_status" TEXT NOT NULL DEFAULT 'observed_not_verified',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItemAllergenStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuItemAllergenStatus_menu_item_id_idx" ON "MenuItemAllergenStatus"("menu_item_id");

-- CreateIndex
CREATE INDEX "MenuItemAllergenStatus_allergen_id_idx" ON "MenuItemAllergenStatus"("allergen_id");

-- CreateIndex
CREATE INDEX "MenuItemAllergenStatus_source_idx" ON "MenuItemAllergenStatus"("source");

-- CreateIndex
CREATE INDEX "MenuItemAllergenStatus_verification_status_idx" ON "MenuItemAllergenStatus"("verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemAllergenStatus_menu_item_id_allergen_id_key" ON "MenuItemAllergenStatus"("menu_item_id", "allergen_id");

-- CreateIndex
CREATE INDEX "MenuItem_restaurant_id_idx" ON "MenuItem"("restaurant_id");

-- CreateIndex
CREATE INDEX "MenuItem_dish_id_idx" ON "MenuItem"("dish_id");

-- CreateIndex
CREATE INDEX "MenuItem_menu_status_idx" ON "MenuItem"("menu_status");

-- CreateIndex
CREATE INDEX "MenuItem_menu_source_type_idx" ON "MenuItem"("menu_source_type");

-- CreateIndex
CREATE INDEX "MenuItem_restaurant_id_menu_status_idx" ON "MenuItem"("restaurant_id", "menu_status");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");

-- CreateIndex
CREATE INDEX "Restaurant_city_idx" ON "Restaurant"("city");

-- CreateIndex
CREATE INDEX "Restaurant_city_district_idx" ON "Restaurant"("city", "district");

-- CreateIndex
CREATE INDEX "Restaurant_review_status_idx" ON "Restaurant"("review_status");

-- CreateIndex
CREATE INDEX "Restaurant_verification_status_idx" ON "Restaurant"("verification_status");

-- CreateIndex
CREATE INDEX "Restaurant_menu_status_idx" ON "Restaurant"("menu_status");

-- AddForeignKey
ALTER TABLE "MenuItemAllergenStatus" ADD CONSTRAINT "MenuItemAllergenStatus_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "MenuItem"("menu_item_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemAllergenStatus" ADD CONSTRAINT "MenuItemAllergenStatus_allergen_id_fkey" FOREIGN KEY ("allergen_id") REFERENCES "Allergen"("allergen_id") ON DELETE CASCADE ON UPDATE CASCADE;

