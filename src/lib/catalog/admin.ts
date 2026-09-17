import { ApiError } from "@/lib/api/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils/app";
import type { Category } from "@/lib/types";
import type { CategoryInput, ProductInput } from "@/lib/validations/schemas";
import { isMissingColumnError } from "@/lib/supabase/errors";
import { getProductById } from "@/lib/catalog/queries";
import type { ProductWithDetails } from "@/lib/types";

export async function createCategory(input: CategoryInput): Promise<Category> {
  const supabase = createAdminClient();
  const base = {
    name: input.name,
    slug: input.slug,
    sort_order: input.sortOrder,
  };
  const withFlags = {
    ...base,
    is_visible: input.isVisible ?? true,
    show_on_home: input.showOnHome ?? true,
  };

  let result = await supabase
    .from("categories")
    .insert(withFlags)
    .select("id, name, slug, sort_order, is_visible, show_on_home")
    .single();

  if (result.error && isMissingColumnError(result.error)) {
    result = await supabase
      .from("categories")
      .insert(base)
      .select("id, name, slug, sort_order")
      .single();
  }

  const { data, error } = result;
  if (error) {
    if (error.code === "23505") {
      throw new ApiError(409, "Категорія з таким slug уже існує");
    }
    throw new ApiError(500, error.message);
  }
  return {
    ...data,
    is_visible: data.is_visible ?? true,
    show_on_home: data.show_on_home ?? true,
  };
}

export async function updateCategory(
  id: string,
  input: Partial<{
    name: string;
    slug: string;
    sortOrder: number;
    isVisible: boolean;
    showOnHome: boolean;
  }>,
): Promise<Category> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};
  if (input.name != null) patch.name = input.name;
  if (input.slug != null) patch.slug = input.slug;
  if (input.sortOrder != null) patch.sort_order = input.sortOrder;
  if (input.isVisible != null) patch.is_visible = input.isVisible;
  if (input.showOnHome != null) patch.show_on_home = input.showOnHome;

  let result = await supabase
    .from("categories")
    .update(patch)
    .eq("id", id)
    .select("id, name, slug, sort_order, is_visible, show_on_home")
    .maybeSingle();

  if (result.error && isMissingColumnError(result.error)) {
    delete patch.is_visible;
    delete patch.show_on_home;
    result = await supabase
      .from("categories")
      .update(patch)
      .eq("id", id)
      .select("id, name, slug, sort_order")
      .maybeSingle();
  }

  const { data, error } = result;
  if (error) {
    if (error.code === "23505") {
      throw new ApiError(409, "Категорія з таким slug уже існує");
    }
    throw new ApiError(500, error.message);
  }
  if (!data) throw new ApiError(404, "Категорію не знайдено");
  return {
    ...data,
    is_visible: data.is_visible ?? true,
    show_on_home: data.show_on_home ?? true,
  };
}

export async function deleteCategory(id: string) {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) throw new ApiError(404, "Категорію не знайдено");

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new ApiError(500, error.message);
}

export async function createProduct(
  input: ProductInput,
): Promise<ProductWithDetails> {
  const supabase = createAdminClient();
  const slug = input.slug || slugify(input.title);
  const payload = {
    title: input.title,
    slug,
    description: input.description ?? "",
    category_id: input.categoryId ?? null,
    is_active: input.isActive ?? true,
    is_featured: input.isFeatured ?? false,
    sort_order: input.sortOrder ?? 0,
  };

  let result = await supabase.from("products").insert(payload).select("id").single();
  if (result.error && isMissingColumnError(result.error)) {
    const withoutFeatured = {
      title: payload.title,
      slug: payload.slug,
      description: payload.description,
      category_id: payload.category_id,
      is_active: payload.is_active,
      sort_order: payload.sort_order,
    };
    result = await supabase
      .from("products")
      .insert(withoutFeatured)
      .select("id")
      .single();
  }

  const { data: product, error } = result;

  if (error || !product) {
    if (error?.code === "23505") {
      throw new ApiError(409, "Товар з таким slug уже існує");
    }
    throw new ApiError(500, error?.message ?? "Не вдалося створити товар");
  }

  try {
    await replaceVariants(product.id, input.variants);
    await replaceImages(product.id, input.imageUrls ?? []);
  } catch (err) {
    await supabase.from("products").delete().eq("id", product.id);
    throw err;
  }

  const created = await getProductById(product.id);
  if (!created) throw new ApiError(500, "Не вдалося прочитати створений товар");
  return created;
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
): Promise<ProductWithDetails> {
  const existing = await getProductById(id);
  if (!existing) throw new ApiError(404, "Товар не знайдено");

  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.title != null) patch.title = input.title;
  if (input.slug != null) patch.slug = input.slug;
  if (input.description != null) patch.description = input.description;
  if (input.categoryId !== undefined) patch.category_id = input.categoryId;
  if (input.isActive != null) patch.is_active = input.isActive;
  if (input.isFeatured != null) patch.is_featured = input.isFeatured;
  if (input.sortOrder != null) patch.sort_order = input.sortOrder;

  if (Object.keys(patch).length > 1) {
    let { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error && isMissingColumnError(error)) {
      delete patch.is_featured;
      ({ error } = await supabase.from("products").update(patch).eq("id", id));
    }
    if (error) {
      if (error.code === "23505") {
        throw new ApiError(409, "Товар з таким slug уже існує");
      }
      throw new ApiError(500, error.message);
    }
  }

  if (input.variants) {
    await replaceVariants(id, input.variants);
  }
  if (input.imageUrls) {
    await replaceImages(id, input.imageUrls);
  }

  const updated = await getProductById(id);
  if (!updated) throw new ApiError(500, "Не вдалося прочитати товар");
  return updated;
}

export async function deleteProduct(id: string) {
  const existing = await getProductById(id);
  if (!existing) throw new ApiError(404, "Товар не знайдено");

  const supabase = createAdminClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new ApiError(500, error.message);
}

async function replaceVariants(
  productId: string,
  variants: ProductInput["variants"],
) {
  const supabase = createAdminClient();
  const { error: delError } = await supabase
    .from("product_variants")
    .delete()
    .eq("product_id", productId);
  if (delError) throw new ApiError(500, delError.message);

  const { error } = await supabase.from("product_variants").insert(
    variants.map((v) => ({
      ...(v.id ? { id: v.id } : {}),
      product_id: productId,
      size: v.size,
      color: v.color,
      price_uah: v.priceUah,
      stock: v.stock,
      sku: v.sku ?? null,
    })),
  );
  if (error) {
    if (error.code === "23505") {
      throw new ApiError(409, "Дубль варіанту (розмір + колір)");
    }
    throw new ApiError(500, error.message);
  }
}

async function replaceImages(productId: string, urls: string[]) {
  const supabase = createAdminClient();
  const { error: delError } = await supabase
    .from("product_images")
    .delete()
    .eq("product_id", productId);
  if (delError) throw new ApiError(500, delError.message);

  if (!urls.length) return;

  const { error } = await supabase.from("product_images").insert(
    urls.map((url, sort_order) => ({
      product_id: productId,
      url,
      sort_order,
    })),
  );
  if (error) throw new ApiError(500, error.message);
}
