import { handleRoute, jsonOk, parseBody } from "@/lib/api/http";
import { requireSession } from "@/lib/auth/guards";
import { getCartLines, replaceCart } from "@/lib/cart/queries";
import { cartPayloadSchema } from "@/lib/validations/schemas";

export async function GET() {
  return handleRoute(async () => {
    const session = await requireSession();
    const items = await getCartLines(session.profileId);
    return jsonOk({ items });
  });
}

export async function PUT(request: Request) {
  return handleRoute(async () => {
    const session = await requireSession();
    const payload = parseBody(cartPayloadSchema, await request.json());
    const items = await replaceCart(session.profileId, payload);
    return jsonOk({ items });
  });
}
