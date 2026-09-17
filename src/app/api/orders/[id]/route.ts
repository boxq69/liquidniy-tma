import { ApiError, handleRoute, jsonOk } from "@/lib/api/http";
import { requireSession } from "@/lib/auth/guards";
import { getOrderById } from "@/lib/orders/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const session = await requireSession();
    const { id } = await params;
    const order = await getOrderById(id);
    if (!order) throw new ApiError(404, "Замовлення не знайдено");
    if (order.profile_id !== session.profileId) {
      throw new ApiError(404, "Замовлення не знайдено");
    }
    return jsonOk({ order });
  });
}
