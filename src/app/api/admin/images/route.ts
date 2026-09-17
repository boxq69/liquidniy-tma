import { ApiError, handleRoute, jsonOk } from "@/lib/api/http";
import { requireAdmin } from "@/lib/auth/guards";
import { uploadProductImage } from "@/lib/storage/product-images";

export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireAdmin();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new ApiError(400, "Очікується поле file");
    }
    const uploaded = await uploadProductImage(file);
    return jsonOk(uploaded, 201);
  });
}
