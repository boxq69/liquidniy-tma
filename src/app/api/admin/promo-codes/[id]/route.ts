import { ApiError, handleRoute, jsonOk, parseBody } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/guards";
import { deletePromoCode, listPromoCodes, updatePromoCode } from "@/lib/admin/marketing";
import { promoCodePatchSchema } from "@/lib/validations/schemas";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;
    const promoCode = (await listPromoCodes()).find((item) => item.id === id);
    if (!promoCode) throw new ApiError(404, "Промокод не знайдено");
    return jsonOk({ promoCode });
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;
    const input = parseBody(promoCodePatchSchema, await request.json());
    const promoCode = await updatePromoCode(id, input);
    return jsonOk({ promoCode });
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;
    await deletePromoCode(id);
    return jsonOk({ ok: true });
  });
}
