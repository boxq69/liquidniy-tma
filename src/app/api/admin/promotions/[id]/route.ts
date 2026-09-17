import { ApiError, handleRoute, jsonOk, parseBody } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/guards";
import { deletePromotion, listPromotions, updatePromotion } from "@/lib/admin/marketing";
import { promotionPatchSchema } from "@/lib/validations/schemas";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;
    const promotion = (await listPromotions()).find((item) => item.id === id);
    if (!promotion) throw new ApiError(404, "Акцію не знайдено");
    return jsonOk({ promotion });
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;
    const input = parseBody(promotionPatchSchema, await request.json());
    const promotion = await updatePromotion(id, input);
    return jsonOk({ promotion });
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;
    await deletePromotion(id);
    return jsonOk({ ok: true });
  });
}
