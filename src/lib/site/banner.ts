import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingColumnError } from "@/lib/supabase/errors";
import { ApiError } from "@/lib/api/http";
import type { SiteBanner } from "@/lib/types";

const FALLBACK: SiteBanner = {
  slot: "home",
  image_url: "/banners/banner.png",
  href: "/",
  title: "LIQUIDNIY",
  is_active: true,
};

export async function getHomeBanner(): Promise<SiteBanner> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("site_banners")
      .select("slot, image_url, href, title, is_active")
      .eq("slot", "home")
      .maybeSingle();
    if (error) return FALLBACK;
    if (!data) return FALLBACK;
    if (!data.is_active) {
      return { ...data, image_url: "" };
    }
    return data;
  } catch {
    return FALLBACK;
  }
}

export async function getHomeBannerAdmin(): Promise<SiteBanner> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("site_banners")
      .select("slot, image_url, href, title, is_active")
      .eq("slot", "home")
      .maybeSingle();
    if (error) {
      if (isMissingColumnError(error)) return FALLBACK;
      throw new ApiError(500, error.message);
    }
    return data ?? FALLBACK;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    return FALLBACK;
  }
}

export async function updateHomeBanner(input: {
  imageUrl?: string;
  href?: string;
  title?: string;
  isActive?: boolean;
}): Promise<SiteBanner> {
  const current = await getHomeBannerAdmin();
  const next = {
    slot: "home",
    image_url: input.imageUrl ?? current.image_url,
    href: input.href ?? current.href,
    title: input.title ?? current.title,
    is_active: input.isActive ?? current.is_active,
    updated_at: new Date().toISOString(),
  };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("site_banners")
    .upsert(next)
    .select("slot, image_url, href, title, is_active")
    .single();

  if (error) {
    if (isMissingColumnError(error)) {
      throw new ApiError(500, "Banner table is missing");
    }
    throw new ApiError(500, error.message);
  }
  return data;
}
