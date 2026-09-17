import { ApiError } from "@/lib/api/http";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadProductImage(file: File): Promise<{ url: string; path: string }> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new ApiError(400, "Дозволені формати: JPEG, PNG, WebP, GIF");
  }
  if (file.size > MAX_BYTES) {
    throw new ApiError(400, "Зображення має бути до 5 МБ");
  }

  const supabase = createAdminClient();
  const path = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw new ApiError(500, error.message);

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return { url: data.publicUrl, path };
}
