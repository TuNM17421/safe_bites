-- Enable PostGIS (Phase 2 geo-readiness). Requires the postgis/postgis image.
CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateEnum
CREATE TYPE "LanguageCode" AS ENUM ('en', 'vi');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('needs_review', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('contains', 'likely_contains', 'possible', 'unlikely', 'unknown');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('suitable', 'ask_first', 'risky', 'avoid', 'unknown');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('manual_seed', 'canonical_recipe', 'menu_observed', 'restaurant_verified', 'user_report', 'llm_inferred');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('manual_seed', 'menu_observed', 'restaurant_submitted', 'user_submitted', 'expert_review', 'openstreetmap', 'openmapvn', 'google_places', 'foursquare', 'admin_verified');

-- CreateEnum
CREATE TYPE "ProfileType" AS ENUM ('allergy', 'religious', 'diet', 'preference');

-- CreateEnum
CREATE TYPE "Strictness" AS ENUM ('low', 'medium', 'strict');

-- CreateTable
CREATE TABLE "ProfileTemplate" (
    "profile_id" TEXT NOT NULL,
    "profile_name_vi" TEXT NOT NULL,
    "profile_name_en" TEXT NOT NULL,
    "profile_type" "ProfileType" NOT NULL,
    "strictness_default" "Strictness" NOT NULL,
    "description_vi" TEXT,
    "description_en" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileTemplate_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "Allergen" (
    "allergen_id" TEXT NOT NULL,
    "name_vi" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "aliases_vi" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aliases_en" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Allergen_pkey" PRIMARY KEY ("allergen_id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "ingredient_id" TEXT NOT NULL,
    "canonical_name_vi" TEXT NOT NULL,
    "canonical_name_en" TEXT NOT NULL,
    "ingredient_category" TEXT NOT NULL,
    "aliases_vi" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aliases_en" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "major_allergen_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dietary_flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "halal_relevance" TEXT,
    "hindu_relevance" TEXT,
    "vegan_relevance" TEXT,
    "calorie_relevance" TEXT,
    "risk_notes_vi" TEXT,
    "risk_notes_en" TEXT,
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'needs_review',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("ingredient_id")
);

-- CreateTable
CREATE TABLE "Dish" (
    "dish_id" TEXT NOT NULL,
    "canonical_name_vi" TEXT NOT NULL,
    "canonical_name_en" TEXT NOT NULL,
    "aliases_vi" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aliases_en" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dish_category" TEXT NOT NULL,
    "cuisine" TEXT NOT NULL,
    "region_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "meal_type" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description_vi" TEXT,
    "description_en" TEXT,
    "common_ingredients_vi" TEXT,
    "common_ingredients_en" TEXT,
    "possible_hidden_ingredients_vi" TEXT,
    "possible_hidden_ingredients_en" TEXT,
    "calorie_class" TEXT,
    "spicy_level" TEXT,
    "picky_eater_flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source_type" "SourceType" NOT NULL DEFAULT 'manual_seed',
    "source_url" TEXT,
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'needs_review',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dish_pkey" PRIMARY KEY ("dish_id")
);

-- CreateTable
CREATE TABLE "DishIngredient" (
    "dish_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "ingredient_role" TEXT NOT NULL,
    "probability_level" TEXT NOT NULL,
    "confidence" DECIMAL(3,2) NOT NULL,
    "evidence_type" "EvidenceType" NOT NULL,
    "source_url" TEXT,
    "notes" TEXT,

    CONSTRAINT "DishIngredient_pkey" PRIMARY KEY ("dish_id","ingredient_id","ingredient_role")
);

-- CreateTable
CREATE TABLE "DishAllergenRisk" (
    "id" TEXT NOT NULL,
    "dish_id" TEXT NOT NULL,
    "allergen_id" TEXT NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "confidence" DECIMAL(3,2) NOT NULL,
    "reason_vi" TEXT NOT NULL,
    "reason_en" TEXT NOT NULL,
    "recommended_action_vi" TEXT NOT NULL,
    "recommended_action_en" TEXT NOT NULL,
    "evidence_type" "EvidenceType" NOT NULL DEFAULT 'manual_seed',
    "source_type" "SourceType" NOT NULL DEFAULT 'manual_seed',
    "source_url" TEXT,
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'needs_review',
    "last_checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DishAllergenRisk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Restaurant" (
    "restaurant_id" TEXT NOT NULL,
    "external_source" "SourceType" NOT NULL,
    "osm_type" TEXT,
    "osm_id" TEXT,
    "external_id" TEXT,
    "canonical_name" TEXT NOT NULL,
    "name_vi" TEXT,
    "name_en" TEXT,
    "amenity" TEXT,
    "cuisine_raw" TEXT,
    "cuisine_normalized" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "full_address" TEXT,
    "street" TEXT,
    "housenumber" TEXT,
    "ward" TEXT,
    "district" TEXT,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Vietnam',
    "lat" DECIMAL(10,7),
    "lon" DECIMAL(10,7),
    "phone" TEXT,
    "website" TEXT,
    "website_menu" TEXT,
    "opening_hours" TEXT,
    "source_url" TEXT,
    "source_observed_at" TIMESTAMP(3),
    "data_license" TEXT,
    "attribution_required" BOOLEAN NOT NULL DEFAULT false,
    "discovery_confidence" DECIMAL(3,2),
    "menu_status" TEXT NOT NULL DEFAULT 'not_observed',
    "verification_status" TEXT NOT NULL DEFAULT 'unverified',
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'needs_review',
    "raw_tags_json" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("restaurant_id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "menu_item_id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "dish_id" TEXT,
    "raw_name" TEXT NOT NULL,
    "name_vi" TEXT,
    "name_en" TEXT,
    "section" TEXT,
    "description_vi" TEXT,
    "description_en" TEXT,
    "price_amount" DECIMAL(12,2),
    "currency" TEXT DEFAULT 'VND',
    "menu_source_type" TEXT NOT NULL,
    "menu_source_url" TEXT,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "parsed_by" TEXT NOT NULL DEFAULT 'manual',
    "mapping_confidence" DECIMAL(3,2),
    "menu_status" TEXT NOT NULL DEFAULT 'observed_not_verified',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("menu_item_id")
);

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rowsRead" INTEGER NOT NULL DEFAULT 0,
    "rowsInserted" INTEGER NOT NULL DEFAULT 0,
    "rowsUpdated" INTEGER NOT NULL DEFAULT 0,
    "rowsSkipped" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DishAllergenRisk_allergen_id_risk_level_idx" ON "DishAllergenRisk"("allergen_id", "risk_level");

-- CreateIndex
CREATE UNIQUE INDEX "DishAllergenRisk_dish_id_allergen_id_key" ON "DishAllergenRisk"("dish_id", "allergen_id");

-- CreateIndex
CREATE INDEX "Restaurant_external_source_external_id_idx" ON "Restaurant"("external_source", "external_id");

-- AddForeignKey
ALTER TABLE "DishIngredient" ADD CONSTRAINT "DishIngredient_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "Dish"("dish_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishIngredient" ADD CONSTRAINT "DishIngredient_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "Ingredient"("ingredient_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishAllergenRisk" ADD CONSTRAINT "DishAllergenRisk_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "Dish"("dish_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishAllergenRisk" ADD CONSTRAINT "DishAllergenRisk_allergen_id_fkey" FOREIGN KEY ("allergen_id") REFERENCES "Allergen"("allergen_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("restaurant_id") ON DELETE CASCADE ON UPDATE CASCADE;
