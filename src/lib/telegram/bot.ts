import { getAppUrl } from "@/lib/utils/app";
import {
  getTelegramBotToken,
  getTelegramBotUsername,
  getTelegramWebhookSecret,
} from "@/lib/telegram/env";

function botApi(method: string) {
  const token = getTelegramBotToken();
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }
  return `https://api.telegram.org/bot${token}/${method}`;
}

export async function telegramApi(
  method: string,
  body: Record<string, unknown>,
) {
  const res = await fetch(botApi(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    description?: string;
  };
  if (!res.ok || json.ok === false) {
    throw new Error(
      json.description ?? `Telegram ${method} failed: ${res.status}`,
    );
  }
  return json;
}

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  extra: Record<string, unknown> = {},
) {
  return telegramApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: extra.parse_mode ?? "HTML",
    ...extra,
  });
}

export async function sendShopWelcome(chatId: number) {
  const appUrl = getAppUrl();
  return sendTelegramMessage(
    chatId,
    "Привіт! Це <b>LIQUIDNIY</b>.\nНатисни кнопку, щоб відкрити магазин.",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Відкрити магазин", web_app: { url: appUrl } }],
        ],
      },
    },
  );
}

export async function setupTelegramBot() {
  const appUrl = getAppUrl();
  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`;
  const secret = getTelegramWebhookSecret();
  const username = getTelegramBotUsername();

  await telegramApi("setWebhook", {
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ["message"],
    drop_pending_updates: false,
  });

  await telegramApi("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "Магазин",
      web_app: { url: appUrl },
    },
  });

  await telegramApi("setMyCommands", {
    commands: [{ command: "start", description: "Відкрити магазин" }],
  });

  return {
    webhookUrl,
    bot: username ? `https://t.me/${username}` : null,
  };
}

export function buildAdminOrderUrl(orderId: string) {
  return `${getAppUrl()}/admin/orders/${orderId}`;
}
