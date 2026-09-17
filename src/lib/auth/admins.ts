import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionUser } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";

export function adminIdsFromEnv(): number[] {
  return (process.env.ADMIN_TELEGRAM_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);
}

export async function isTelegramAdmin(
  supabase: SupabaseClient,
  telegramId: number,
): Promise<boolean> {
  if (adminIdsFromEnv().includes(telegramId)) return true;

  try {
    const { data } = await supabase
      .from("admins")
      .select("telegram_id")
      .eq("telegram_id", telegramId)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

export async function sessionHasAdminAccess(
  session: SessionUser | null,
): Promise<boolean> {
  if (!session?.telegramId) return false;
  if (adminIdsFromEnv().includes(session.telegramId)) return true;
  if (session.isAdmin) return true;
  try {
    return await isTelegramAdmin(createAdminClient(), session.telegramId);
  } catch {
    return false;
  }
}

export async function listAdminTelegramIds(
  supabase: SupabaseClient,
): Promise<number[]> {
  const { data } = await supabase.from("admins").select("telegram_id");
  const fromDb = (data ?? []).map((row) => Number(row.telegram_id));
  return [...new Set([...adminIdsFromEnv(), ...fromDb])];
}
