"use client";

import { useEffect } from "react";
import { waitForTelegramWebApp } from "@/lib/telegram/webapp-client";
import type { WebApp } from "@twa-dev/types";

const TELEGRAM_HEADER_FALLBACK_PX = 72;
let lastSafeTop = -1;

function applySafeTop(wa: WebApp) {
  const deviceTop = wa.safeAreaInset?.top ?? 0;
  const chromeTop = wa.contentSafeAreaInset?.top ?? 0;
  let top = deviceTop + chromeTop;

  const inTelegram =
    Boolean(wa.initData) || (wa.platform && wa.platform !== "unknown");

  if (inTelegram && top < 24) {
    top = TELEGRAM_HEADER_FALLBACK_PX;
  }

  if (top === lastSafeTop) return;
  lastSafeTop = top;
  document.documentElement.style.setProperty("--app-safe-top", `${top}px`);
}

export function TelegramSafeArea() {
  useEffect(() => {
    let cancelled = false;
    let wa: WebApp | null = null;
    let timer: number | null = null;

    const sync = () => {
      if (cancelled || !wa) return;
      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!cancelled && wa) applySafeTop(wa);
      }, 80);
    };

    void waitForTelegramWebApp().then((webApp) => {
      if (cancelled || !webApp) return;
      wa = webApp;
      applySafeTop(webApp);
      webApp.onEvent("contentSafeAreaChanged", sync);
      webApp.onEvent("safeAreaChanged", sync);
      webApp.onEvent("viewportChanged", sync);
    });

    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
      wa?.offEvent("contentSafeAreaChanged", sync);
      wa?.offEvent("safeAreaChanged", sync);
      wa?.offEvent("viewportChanged", sync);
    };
  }, []);

  return null;
}
