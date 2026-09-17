import { handleRoute, jsonOk, parseBody } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/guards";
import { listProducts } from "@/lib/catalog/queries";
import { createProduct } from "@/lib/catalog/admin";
import { productInputSchema } from "@/lib/validations/schemas";

export async function GET() {
  return handleRoute(async () => {
    await requireAdmin();
    const items = await listProducts({}, { includeInactive: true });
    return jsonOk({ items });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireAdmin();
    const input = parseBody(productInputSchema, await request.json());
    const product = await createProduct(input);
    return jsonOk({ product }, 201);
  });
}
