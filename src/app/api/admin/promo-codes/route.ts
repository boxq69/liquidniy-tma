import { handleRoute, jsonOk, parseBody } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/guards";
import { createPromoCode, listPromoCodes } from "@/lib/admin/marketing";
import { promoCodeInputSchema } from "@/lib/validations/schemas";

export async function GET() {
  return handleRoute(async () => {
    await requireAdmin();
    const items = await listPromoCodes();
    return jsonOk({ items });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireAdmin();
    const input = parseBody(promoCodeInputSchema, await request.json());
    const promoCode = await createPromoCode(input);
    return jsonOk({ promoCode }, 201);
  });
}
