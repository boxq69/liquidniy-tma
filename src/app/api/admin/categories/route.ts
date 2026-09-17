import { handleRoute, jsonOk, parseBody } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/guards";
import { listCategories } from "@/lib/catalog/queries";
import { createCategory } from "@/lib/catalog/admin";
import { categoryInputSchema } from "@/lib/validations/schemas";

export async function GET() {
  return handleRoute(async () => {
    await requireAdmin();
    const items = await listCategories();
    return jsonOk({ items });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireAdmin();
    const input = parseBody(categoryInputSchema, await request.json());
    const category = await createCategory(input);
    return jsonOk({ category }, 201);
  });
}
