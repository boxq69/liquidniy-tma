import { handleRoute, jsonOk, parseBody } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/guards";
import { createPromotion, listPromotions } from "@/lib/admin/marketing";
import { promotionInputSchema } from "@/lib/validations/schemas";

export async function GET() {
  return handleRoute(async () => {
    await requireAdmin();
    const items = await listPromotions();
    return jsonOk({ items });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireAdmin();
    const input = parseBody(promotionInputSchema, await request.json());
    const promotion = await createPromotion(input);
    return jsonOk({ promotion }, 201);
  });
}
