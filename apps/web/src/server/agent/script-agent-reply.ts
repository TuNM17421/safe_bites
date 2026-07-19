import { prisma } from '@/lib/db';
import type { AgentReply, BotRestaurant, DataEditProposal } from '@/lib/agent-schemas';
import { detectAgentIntent } from './agent-intent';

async function pickRestaurant(city: string): Promise<BotRestaurant | null> {
  const r = await prisma.restaurant.findFirst({
    where: { reviewStatus: 'approved', city, menuItems: { some: {} } },
    select: { id: true, slug: true, canonicalName: true, nameEn: true, nameVi: true },
    orderBy: { updatedAt: 'desc' },
  });
  if (!r) return null;
  // Real restaurant + link; the % here is a canned scripted score (a real LLM/engine fills it later).
  return {
    restaurantId: r.id,
    slug: r.slug,
    name: { en: r.nameEn ?? r.canonicalName, vi: r.nameVi ?? r.canonicalName },
    compatibility: 88,
    distanceMeters: 320,
  };
}

async function pickProposal(): Promise<DataEditProposal | null> {
  const [menuItem, ingredient] = await Promise.all([
    prisma.menuItem.findFirst({
      where: { restaurant: { reviewStatus: 'approved' } },
      select: { id: true, restaurantId: true, rawName: true, nameEn: true },
      orderBy: { id: 'asc' },
    }),
    prisma.ingredient.findFirst({ where: { id: 'ing_peanut' }, select: { id: true, canonicalNameEn: true, canonicalNameVi: true } }),
  ]);
  if (!menuItem || !ingredient) return null;
  return {
    restaurantId: menuItem.restaurantId,
    menuItemId: menuItem.id,
    menuItemName: menuItem.nameEn ?? menuItem.rawName,
    ingredientId: ingredient.id,
    ingredientName: { en: ingredient.canonicalNameEn, vi: ingredient.canonicalNameVi },
    present: true,
    proposedStatus: 'avoid',
    reason: { en: 'Owner said the dish is fried in peanut oil.', vi: 'Chủ quán nói món này chiên bằng dầu đậu phộng.' },
  };
}

export async function scriptAgentReply(input: { message: string; allergenIds: string[]; city: string }): Promise<AgentReply> {
  switch (detectAgentIntent(input.message)) {
    case 'report': {
      const proposal = await pickProposal();
      if (proposal) {
        return {
          text: {
            en: `Thanks! I'll propose adding "${proposal.ingredientName.en}" to ${proposal.menuItemName} and setting its light to Avoid. Confirm below.`,
            vi: `Cảm ơn! Mình sẽ đề xuất thêm "${proposal.ingredientName.vi}" vào ${proposal.menuItemName} và đổi đèn sang Không hợp. Bạn xác nhận bên dưới nhé.`,
          },
          restaurant: null,
          proposal,
        };
      }
      break;
    }
    case 'suggest': {
      const restaurant = await pickRestaurant(input.city);
      return {
        text: {
          en: 'Based on your allergy profile, here is a nearby place worth a look. Always confirm ingredients with staff.',
          vi: 'Dựa trên hồ sơ dị ứng của bạn, đây là một quán gần đây đáng thử. Luôn hỏi lại nhân viên về thành phần nhé.',
        },
        restaurant,
        proposal: null,
      };
    }
    default:
      break;
  }
  return {
    text: {
      en: 'I can suggest nearby dishes for your allergies, or note an ingredient a restaurant told you about — just tell me.',
      vi: 'Mình có thể gợi ý món gần đây theo dị ứng của bạn, hoặc ghi nhận một nguyên liệu mà quán cho bạn biết — cứ nhắn mình nhé.',
    },
    restaurant: null,
    proposal: null,
  };
}
