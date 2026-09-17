import { handleRoute, jsonOk } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/guards";
import { listAllOrders } from "@/lib/orders/queries";
import { orderStatusSchema } from "@/lib/validations/schemas";

export async function GET(request: Request) {
  return handleRoute(async () => {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get("status");
    const parsed = raw ? orderStatusSchema.safeParse(raw) : null;
    const status = parsed?.success ? parsed.data : undefined;
    const items = await listAllOrders(status);
    return jsonOk({ items });
  });
}
