import { handleRoute, jsonOk, parseBody } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/guards";
import { deleteCategory, updateCategory } from "@/lib/catalog/admin";
import { categoryPatchSchema } from "@/lib/validations/schemas";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;
    const input = parseBody(categoryPatchSchema, await request.json());
    const category = await updateCategory(id, input);
    return jsonOk({ category });
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireAdmin();
    const { id } = await params;
    await deleteCategory(id);
    return jsonOk({ ok: true });
  });
}
