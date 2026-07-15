-- CreateTable
CREATE TABLE "OcrReviewItem" (
    "id" TEXT NOT NULL,
    "dish_guess_vi" TEXT NOT NULL,
    "dish_guess_en" TEXT NOT NULL,
    "photo_ref" TEXT,
    "restaurant_id" TEXT,
    "menu_item_id" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'needs_review',
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OcrReviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrReviewIngredient" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "ingredient_id" TEXT,
    "raw_name" TEXT NOT NULL,
    "confidence" DECIMAL(3,2),
    "decision" TEXT NOT NULL DEFAULT 'pending',
    "edited_name" TEXT,

    CONSTRAINT "OcrReviewIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OcrReviewItem_status_idx" ON "OcrReviewItem"("status");

-- CreateIndex
CREATE INDEX "OcrReviewIngredient_item_id_idx" ON "OcrReviewIngredient"("item_id");

-- AddForeignKey
ALTER TABLE "OcrReviewItem" ADD CONSTRAINT "OcrReviewItem_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("restaurant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrReviewItem" ADD CONSTRAINT "OcrReviewItem_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "MenuItem"("menu_item_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrReviewIngredient" ADD CONSTRAINT "OcrReviewIngredient_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "OcrReviewItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrReviewIngredient" ADD CONSTRAINT "OcrReviewIngredient_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "Ingredient"("ingredient_id") ON DELETE SET NULL ON UPDATE CASCADE;
