import { handleRoute, jsonOk, parseBody } from "@/lib/api/http";
import { requireSession } from "@/lib/auth/guards";
import { priceCheckoutItems } from "@/lib/orders/pricing";
import { promoPreviewSchema } from "@/lib/validations/schemas";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const session = await requireSession();
    const input = parseBody(promoPreviewSchema, await request.json());
    const preview = await priceCheckoutItems(input.items, {
      profileId: session.profileId,
      code: input.code,
    });
    return jsonOk({
      subtotalUah: preview.subtotalUah,
      discountUah: preview.discountUah,
      totalUah: preview.totalUah,
      promoCode: preview.promoCode,
      message: preview.message,
    });
  });
}
