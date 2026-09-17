export function getTelegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
}

export function getTelegramBotUsername() {
  return process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "") ?? "";
}

export function getTelegramWebhookSecret() {
  const raw = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (raw) {
    return raw.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 256) || "liq-webhook";
  }
  return "liq-webhook";
}
