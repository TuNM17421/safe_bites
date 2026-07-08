import { ReviewStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { DashboardCards } from './dashboard-cards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// RSC dashboard: counts read directly via Prisma (already behind the middleware perimeter).
export default async function AdminDashboardPage() {
  const [dishes, ingredients, dishRisks, needsReview] = await Promise.all([
    prisma.dish.count(),
    prisma.ingredient.count(),
    prisma.dishAllergenRisk.count(),
    prisma.dish.count({ where: { reviewStatus: ReviewStatus.needs_review } }),
  ]);
  return <DashboardCards counts={{ dishes, ingredients, dishRisks, needsReview }} />;
}
