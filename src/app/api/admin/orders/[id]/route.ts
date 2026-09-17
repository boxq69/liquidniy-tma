import { ApiError, handleRoute, jsonOk, parseBody } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/guards";
import { getOrderById, updateOrderStatus } from "@/lib/orders/queries";
import { orderStatusPatchSchema } from "@/lib/validations/schemas";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;
    const order = await getOrderById(id);
    if (!order) throw new ApiError(404, "Замовлення не знайдено");
    return jsonOk({ order });
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;
    const { status } = parseBody(orderStatusPatchSchema, await request.json());
    const order = await updateOrderStatus(id, status);
    return jsonOk({ order });
  });
}
