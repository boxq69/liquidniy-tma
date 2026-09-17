import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/http";
import { adminIdsFromEnv } from "@/lib/auth/admins";
import { isMissingColumnError } from "@/lib/supabase/errors";
import type { AdminUser } from "@/lib/types";

const PROFILE_SELECT_FULL =
  "id, telegram_id, username, first_name, last_name, photo_url, is_blocked, created_at";
const PROFILE_SELECT_BASIC =
  "id, telegram_id, username, first_name, last_name, created_at";

type ProfileRow = {
  id: string;
  telegram_id: number | string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  photo_url?: string | null;
  is_blocked?: boolean | null;
};

async function loadProfiles(): Promise<ProfileRow[]> {
  const supabase = createAdminClient();
  const full = await supabase
    .from("profiles")
    .select(PROFILE_SELECT_FULL)
    .order("created_at", { ascending: false })
    .limit(200);
  if (!full.error) return (full.data ?? []) as ProfileRow[];
  if (!isMissingColumnError(full.error)) {
    throw new ApiError(500, full.error.message);
  }
  const basic = await supabase
    .from("profiles")
    .select(PROFILE_SELECT_BASIC)
    .order("created_at", { ascending: false })
    .limit(200);
  if (basic.error) throw new ApiError(500, basic.error.message);
  return (basic.data ?? []) as ProfileRow[];
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const supabase = createAdminClient();
  const profiles = await loadProfiles();
  if (profiles.length === 0) return [];

  const ids = profiles.map((row) => row.id);
  const { data: orderRows, error: orderError } = await supabase
    .from("orders")
    .select("profile_id")
    .in("profile_id", ids);
  if (orderError) throw new ApiError(500, orderError.message);

  const orderCounts = new Map<string, number>();
  for (const row of orderRows ?? []) {
    orderCounts.set(row.profile_id, (orderCounts.get(row.profile_id) ?? 0) + 1);
  }

  const { data: adminRows, error: adminError } = await supabase
    .from("admins")
    .select("telegram_id");
  if (adminError) throw new ApiError(500, adminError.message);

  const envAdmins = new Set(adminIdsFromEnv());
  const dbAdmins = new Set(
    (adminRows ?? []).map((row) => Number(row.telegram_id)),
  );

  return profiles.map((row) => {
    const telegramId = Number(row.telegram_id);
    return {
      id: row.id,
      telegram_id: telegramId,
      username: row.username,
      first_name: row.first_name,
      last_name: row.last_name,
      photo_url: row.photo_url ?? null,
      is_blocked: Boolean(row.is_blocked),
      created_at: row.created_at,
      is_env_admin: envAdmins.has(telegramId),
      is_admin: envAdmins.has(telegramId) || dbAdmins.has(telegramId),
      orders_count: orderCounts.get(row.id) ?? 0,
    };
  });
}

export async function updateAdminUser(
  id: string,
  input: { isBlocked?: boolean; isAdmin?: boolean },
  actorTelegramId: number,
): Promise<AdminUser> {
  const supabase = createAdminClient();
  let profileResult = await supabase
    .from("profiles")
    .select(PROFILE_SELECT_FULL)
    .eq("id", id)
    .maybeSingle();
  if (profileResult.error && isMissingColumnError(profileResult.error)) {
    profileResult = await supabase
      .from("profiles")
      .select(PROFILE_SELECT_BASIC)
      .eq("id", id)
      .maybeSingle();
  }
  const { data: profile, error } = profileResult;

  if (error) throw new ApiError(500, error.message);
  if (!profile) throw new ApiError(404, "Користувача не знайдено");

  const telegramId = Number(profile.telegram_id);
  const envAdmin = adminIdsFromEnv().includes(telegramId);

  if (input.isBlocked != null) {
    if (telegramId === actorTelegramId) {
      throw new ApiError(400, "Не можна заблокувати власний акаунт");
    }
    if (envAdmin) {
      throw new ApiError(400, "Не можна блокувати адміна з .env");
    }
    const { error: patchError } = await supabase
      .from("profiles")
      .update({ is_blocked: input.isBlocked })
      .eq("id", id);
    if (patchError) {
      if (isMissingColumnError(patchError)) {
        throw new ApiError(
          503,
          "Cannot block users: profiles.is_blocked is missing",
        );
      }
      throw new ApiError(500, patchError.message);
    }
  }

  if (input.isAdmin != null) {
    if (envAdmin && !input.isAdmin) {
      throw new ApiError(400, "Адміна з .env не можна зняти тут");
    }
    if (input.isAdmin) {
      const { error: insertError } = await supabase
        .from("admins")
        .upsert({ telegram_id: telegramId });
      if (insertError) throw new ApiError(500, insertError.message);
    } else {
      const { error: deleteError } = await supabase
        .from("admins")
        .delete()
        .eq("telegram_id", telegramId);
      if (deleteError) throw new ApiError(500, deleteError.message);
    }
  }

  const users = await listAdminUsers();
  const next = users.find((user) => user.id === id);
  if (!next) throw new ApiError(500, "Не вдалося прочитати користувача");
  return next;
}
