-- AlterEnum
ALTER TYPE "FeedbackAdminActionType" ADD VALUE 'approve_ingredient_correction';

-- AlterTable
ALTER TABLE "FeedbackReport" ADD COLUMN     "correction_ingredient_id" TEXT,
ADD COLUMN     "correction_present" BOOLEAN;
