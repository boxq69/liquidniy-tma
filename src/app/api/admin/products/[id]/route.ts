import { ApiError, handleRoute, jsonOk, parseBody } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/guards";
import { getProductById } from "@/lib/catalog/queries";
import { deleteProduct, updateProduct } from "@/lib/catalog/admin";
import { productPatchSchema } from "@/lib/validations/schemas";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;
    const product = await getProductById(id);
    if (!product) throw new ApiError(404, "Товар не знайдено");
    return jsonOk({ product });
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;
    const input = parseBody(productPatchSchema, await request.json());
    const product = await updateProduct(id, input);
    return jsonOk({ product });
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;
    await deleteProduct(id);
    return jsonOk({ ok: true });
  });
}
