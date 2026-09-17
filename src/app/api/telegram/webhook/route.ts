import { NextRequest } from "next/server";
import { ApiError, handleRoute, jsonOk } from "@/lib/api/http";
import {
  getTelegramBotToken,
  getTelegramWebhookSecret,
} from "@/lib/telegram/env";
import { upsertTelegramProfile } from "@/lib/telegram/profiles";
import { sendShopWelcome, setupTelegramBot } from "@/lib/telegram/bot";

type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_bot?: boolean;
};

type TelegramUpdate = {
  message?: {
    text?: string;
    from?: TelegramUser;
    chat?: { id: number; type?: string };
  };
};

function isSetupAuthorized(request: NextRequest) {
  const secret = getTelegramWebhookSecret();
  const header = request.headers.get("x-setup-secret");
  const query = request.nextUrl.searchParams.get("secret");
  return Boolean(secret && (header === secret || query === secret));
}

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const setup = request.nextUrl.searchParams.get("setup");
    if (setup !== "1") {
      return jsonOk({
        ok: true,
        hint: "POST Telegram updates here. To register webhook: ?setup=1&secret=TELEGRAM_WEBHOOK_SECRET",
        telegram: Boolean(getTelegramBotToken()),
      });
    }
    if (!getTelegramBotToken()) {
      throw new ApiError(
        500,
        "TELEGRAM_BOT_TOKEN порожній. Додай токен з BotFather у .env.local",
      );
    }
    if (!isSetupAuthorized(request)) {
      throw new ApiError(401, "Невірний secret для setup webhook");
    }
    const result = await setupTelegramBot();
    return jsonOk({ ok: true, ...result });
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const expected = getTelegramWebhookSecret();
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (expected && header !== expected) {
      throw new ApiError(401, "Invalid webhook secret");
    }

    const update = (await request.json()) as TelegramUpdate;
    const from = update.message?.from;
    if (!from?.id || from.is_bot) {
      return jsonOk({ ok: true });
    }

    try {
      await upsertTelegramProfile({
        id: from.id,
        username: from.username,
        first_name: from.first_name,
        last_name: from.last_name,
      });
    } catch (err) {
      console.error("Telegram profile upsert failed", err);
    }

    const text = update.message?.text?.trim() ?? "";
    const chatId = update.message?.chat?.id ?? from.id;
    if (text.startsWith("/start") || text === "/shop") {
      await sendShopWelcome(chatId);
    }

    return jsonOk({ ok: true });
  });
}
