import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramWebAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
};

export type ParsedInitData = {
  user: TelegramWebAppUser;
  authDate: number;
  queryId?: string;
  startParam?: string;
};

/**
 * Validates Telegram Mini App initData (HMAC-SHA-256).
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400,
): ParsedInitData {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    throw new Error("Missing hash in initData");
  }

  params.delete("hash");
  const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const hashBuf = Buffer.from(hash, "hex");
  const calcBuf = Buffer.from(calculated, "hex");
  if (
    hashBuf.length !== calcBuf.length ||
    !timingSafeEqual(hashBuf, calcBuf)
  ) {
    throw new Error("Invalid initData signature");
  }

  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSeconds) {
    throw new Error("initData expired");
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    throw new Error("Missing user in initData");
  }

  const user = JSON.parse(userRaw) as TelegramWebAppUser;
  if (!user?.id) {
    throw new Error("Invalid user in initData");
  }

  return {
    user,
    authDate,
    queryId: params.get("query_id") ?? undefined,
    startParam: params.get("start_param") ?? undefined,
  };
}
