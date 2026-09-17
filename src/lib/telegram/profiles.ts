import { ApiError } from "@/lib/api/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTelegramAdmin } from "@/lib/auth/admins";
import { isMissingColumnError } from "@/lib/supabase/errors";
import { signSession } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/types";

export type TelegramProfileInput = {
  id: number;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  photo_url?: string | null;
};

export async function upsertTelegramProfile(
  user: TelegramProfileInput,
): Promise<SessionUser> {
  const supabase = createAdminClient();
  const row = {
    telegram_id: user.id,
    username: user.username ?? null,
    first_name: user.first_name ?? null,
    last_name: user.last_name ?? null,
  };

  const withPhoto = { ...row, photo_url: user.photo_url ?? null };
  let result = await supabase
    .from("profiles")
    .upsert(withPhoto, { onConflict: "telegram_id" })
    .select("id, telegram_id, username, first_name, last_name")
    .single();

  if (result.error && isMissingColumnError(result.error)) {
    result = await supabase
      .from("profiles")
      .upsert(row, { onConflict: "telegram_id" })
      .select("id, telegram_id, username, first_name, last_name")
      .single();
  }

  const { data: profile, error } = result;
  if (error || !profile) {
    throw new ApiError(500, error?.message ?? "Profile upsert failed");
  }

  const blocked = await supabase
    .from("profiles")
    .select("is_blocked")
    .eq("id", profile.id)
    .maybeSingle();
  if (!blocked.error && blocked.data?.is_blocked) {
    throw new ApiError(403, "Акаунт заблоковано");
  }

  const isAdmin = await isTelegramAdmin(supabase, user.id);

  return {
    profileId: profile.id,
    telegramId: profile.telegram_id,
    username: profile.username,
    firstName: profile.first_name,
    lastName: profile.last_name,
    isAdmin,
  };
}

export async function issueSession(user: TelegramProfileInput) {
  const sessionUser = await upsertTelegramProfile(user);
  const token = await signSession(sessionUser);
  return { sessionUser, token };
}
