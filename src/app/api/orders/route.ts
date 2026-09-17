import { handleRoute, jsonOk, parseBody, ApiError } from "@/lib/api/http";
import { requireSession } from "@/lib/auth/guards";
import {
  getOrderById,
  listOrdersForProfile,
  notifyAdminsAboutOrder,
  placeOrder,
} from "@/lib/orders/queries";
import { checkoutSchema } from "@/lib/validations/schemas";

export async function GET() {
  return handleRoute(async () => {
    const session = await requireSession();
    const items = await listOrdersForProfile(session.profileId);
    return jsonOk({ items });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const session = await requireSession();
    const input = parseBody(checkoutSchema, await request.json());
    const result = await placeOrder(session, input);

    const order = await getOrderById(result.orderId);
    if (!order) throw new ApiError(500, "Замовлення створено, але не прочитано");

    await notifyAdminsAboutOrder(result, input).catch(() => undefined);

    return jsonOk({
      orderId: result.orderId,
      totalUah: result.totalUah,
      persisted: true,
      order,
    });
  });
}
