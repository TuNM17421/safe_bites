-- CreateEnum
CREATE TYPE "FeedbackReportStatus" AS ENUM ('needs_review', 'in_review', 'resolved', 'dismissed', 'spam');

-- CreateEnum
CREATE TYPE "FeedbackPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "FeedbackReaction" AS ENUM ('none', 'mild', 'moderate', 'severe', 'anaphylaxis_or_emergency', 'not_sure', 'prefer_not_to_say');

-- CreateEnum
CREATE TYPE "FeedbackReactionTiming" AS ENUM ('during_meal', 'within_2_hours', 'later_same_day', 'next_day_or_later', 'not_sure', 'not_applicable');

-- CreateEnum
CREATE TYPE "StaffAnswer" AS ENUM ('confirmed_no_allergen', 'confirmed_contains_allergen', 'confirmed_can_remove', 'confirmed_cannot_remove', 'kitchen_checked', 'not_sure', 'language_barrier', 'no_answer', 'other');

-- CreateEnum
CREATE TYPE "FeedbackFlagStatus" AS ENUM ('active', 'resolved', 'dismissed', 'expired');

-- CreateEnum
CREATE TYPE "FeedbackFlagEffect" AS ENUM ('flag_for_review', 'downgrade_confidence', 'suppress_suitable', 'cap_restaurant_readiness', 'hide_recommendation');

-- CreateEnum
CREATE TYPE "FeedbackEntityType" AS ENUM ('restaurant', 'menu_item', 'dish');

-- CreateEnum
CREATE TYPE "FeedbackAdminActionType" AS ENUM ('start_review', 'resolve_no_change', 'dismiss_report', 'mark_spam', 'confirm_feedback_flag', 'clear_feedback_flag', 'request_reverification', 'apply_confidence_downgrade', 'suppress_suitable_until_review', 'hide_menu_item_temporarily', 'add_note');

-- CreateTable
CREATE TABLE "FeedbackReport" (
    "id" TEXT NOT NULL,
    "client_report_id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "locale" TEXT,
    "client_platform" TEXT NOT NULL DEFAULT 'pwa_web',
    "submission_source" TEXT NOT NULL DEFAULT 'online',
    "offline_created_at" TIMESTAMP(3),
    "restaurant_id" TEXT NOT NULL,
    "menu_item_id" TEXT,
    "dish_id" TEXT,
    "allergen_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "profile_snapshot" JSONB NOT NULL,
    "recommendation_snapshot" JSONB,
    "ate_here" BOOLEAN,
    "visited_at" TIMESTAMP(3),
    "asked_staff" BOOLEAN,
    "staff_answer" "StaffAnswer",
    "staff_answer_text" TEXT,
    "reaction" "FeedbackReaction" NOT NULL,
    "reaction_timing" "FeedbackReactionTiming",
    "user_trust_rating" INTEGER,
    "notes" TEXT,
    "status" "FeedbackReportStatus" NOT NULL DEFAULT 'needs_review',
    "priority" "FeedbackPriority" NOT NULL DEFAULT 'normal',
    "severe_auto_flagged" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "review_outcome" TEXT,
    "admin_summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackFlag" (
    "id" TEXT NOT NULL,
    "report_id" TEXT,
    "entity_type" "FeedbackEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "restaurant_id" TEXT,
    "menu_item_id" TEXT,
    "dish_id" TEXT,
    "allergen_id" TEXT,
    "effect" "FeedbackFlagEffect" NOT NULL,
    "status" "FeedbackFlagStatus" NOT NULL DEFAULT 'active',
    "priority" "FeedbackPriority" NOT NULL DEFAULT 'normal',
    "reason" TEXT NOT NULL,
    "public_reason_key" TEXT,
    "confidence_delta" DOUBLE PRECISION,
    "readiness_cap" TEXT,
    "expires_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "admin_note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackAdminAction" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "flag_id" TEXT,
    "action_type" "FeedbackAdminActionType" NOT NULL,
    "actor" TEXT NOT NULL,
    "note" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackAdminAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackReport_client_report_id_key" ON "FeedbackReport"("client_report_id");

-- CreateIndex
CREATE INDEX "FeedbackReport_restaurant_id_createdAt_idx" ON "FeedbackReport"("restaurant_id", "createdAt");

-- CreateIndex
CREATE INDEX "FeedbackReport_menu_item_id_createdAt_idx" ON "FeedbackReport"("menu_item_id", "createdAt");

-- CreateIndex
CREATE INDEX "FeedbackReport_dish_id_createdAt_idx" ON "FeedbackReport"("dish_id", "createdAt");

-- CreateIndex
CREATE INDEX "FeedbackReport_status_priority_createdAt_idx" ON "FeedbackReport"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "FeedbackFlag_entity_type_entity_id_status_idx" ON "FeedbackFlag"("entity_type", "entity_id", "status");

-- CreateIndex
CREATE INDEX "FeedbackFlag_restaurant_id_status_idx" ON "FeedbackFlag"("restaurant_id", "status");

-- CreateIndex
CREATE INDEX "FeedbackFlag_menu_item_id_status_idx" ON "FeedbackFlag"("menu_item_id", "status");

-- CreateIndex
CREATE INDEX "FeedbackFlag_dish_id_status_idx" ON "FeedbackFlag"("dish_id", "status");

-- CreateIndex
CREATE INDEX "FeedbackFlag_allergen_id_status_idx" ON "FeedbackFlag"("allergen_id", "status");

-- CreateIndex
CREATE INDEX "FeedbackAdminAction_report_id_createdAt_idx" ON "FeedbackAdminAction"("report_id", "createdAt");

-- CreateIndex
CREATE INDEX "FeedbackAdminAction_flag_id_createdAt_idx" ON "FeedbackAdminAction"("flag_id", "createdAt");

-- AddForeignKey
ALTER TABLE "FeedbackReport" ADD CONSTRAINT "FeedbackReport_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("restaurant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackReport" ADD CONSTRAINT "FeedbackReport_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "MenuItem"("menu_item_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackReport" ADD CONSTRAINT "FeedbackReport_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "Dish"("dish_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackFlag" ADD CONSTRAINT "FeedbackFlag_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "FeedbackReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackAdminAction" ADD CONSTRAINT "FeedbackAdminAction_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "FeedbackReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackAdminAction" ADD CONSTRAINT "FeedbackAdminAction_flag_id_fkey" FOREIGN KEY ("flag_id") REFERENCES "FeedbackFlag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

