import type { WebApp } from "@twa-dev/types";

type TelegramWebView = {
  onEvent: (eventType: string, callback: () => void) => void;
  offEvent: (eventType: string, callback: () => void) => void;
  postEvent?: (eventType: string, callback: false, eventData?: unknown) => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp: WebApp;
      WebView?: TelegramWebView;
    };
    TelegramWebviewProxy?: {
      postEvent: (eventType: string, eventData?: string) => void;
    };
  }
}

let didReady = false;
let swipeLocked = false;
let desiredBackVisible = false;
let lastBackVisible: boolean | null = null;
let assertTimer: number | null = null;
let resyncBound = false;
let readyPromise: Promise<WebApp | null> | null = null;
let scriptPromise: Promise<void> | null = null;

export function captureTelegramHash() {
  if (typeof window === "undefined") return;
  try {
    const hash = window.location.hash || "";
    if (!hash) return;
    const params: Record<string, string> = {};
    for (const segment of hash.replace(/^#/, "").split("&")) {
      if (!segment) continue;
      const eq = segment.indexOf("=");
      const key = decodeURIComponent(
        (eq < 0 ? segment : segment.slice(0, eq)).replace(/\+/g, " "),
      );
      const value =
        eq < 0
          ? ""
          : decodeURIComponent(segment.slice(eq + 1).replace(/\+/g, " "));
      params[key] = value;
    }
    sessionStorage.setItem("__telegram__initParams", JSON.stringify(params));
  } catch {
    // Invalid Telegram hash fragment.
  }
}

export function ensureTelegramWebAppScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Telegram?.WebApp) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-telegram-web-app="true"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Telegram WebApp script failed to load")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js?63";
    script.async = true;
    script.dataset.telegramWebApp = "true";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Telegram WebApp script failed to load"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

function disableVerticalSwipes(wa: WebApp) {
  if (swipeLocked) return;
  swipeLocked = true;

  postTelegramEvent("web_app_setup_swipe_behavior", {
    allow_vertical_swipe: false,
  });

  if (!wa.isVersionAtLeast?.("7.7")) return;
  const withSwipes = wa as WebApp & {
    disableVerticalSwipes?: () => void;
  };
  withSwipes.disableVerticalSwipes?.();
}

function markReady(wa: WebApp) {
  if (!didReady) {
    wa.ready();
    wa.expand();
    disableVerticalSwipes(wa);
    didReady = true;
  }
  return wa;
}

export function getTelegramWebApp(): WebApp | null {
  if (typeof window === "undefined") return null;
  const wa = window.Telegram?.WebApp;
  return wa ? markReady(wa) : null;
}

export function waitForTelegramWebApp(timeoutMs = 8000): Promise<WebApp | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (readyPromise) return readyPromise;

  const existing = getTelegramWebApp();
  if (existing) {
    readyPromise = Promise.resolve(existing);
    return readyPromise;
  }

  readyPromise = ensureTelegramWebAppScript()
    .catch(() => undefined)
    .then(
      () =>
        new Promise<WebApp | null>((resolve) => {
          const started = Date.now();
          const tick = () => {
            const wa = window.Telegram?.WebApp;
            if (wa) {
              resolve(markReady(wa));
              return;
            }
            if (Date.now() - started >= timeoutMs) {
              resolve(null);
              return;
            }
            window.setTimeout(tick, 50);
          };
          tick();
        }),
    );

  return readyPromise;
}

/**
 * Native Mini App back button. WebApp.version 6.0 is a no-op in show().
 * @see https://docs.telegram-mini-apps.com/platform/methods#web-app-setup-back-button
 */
export function postTelegramEvent(
  eventType: string,
  eventData: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return;

  if (window.TelegramWebviewProxy) {
    window.TelegramWebviewProxy.postEvent(
      eventType,
      JSON.stringify(eventData),
    );
    return;
  }

  const webView = window.Telegram?.WebView;
  if (webView?.postEvent) {
    webView.postEvent(eventType, false, eventData);
    return;
  }
}

function syncBackButton() {
  if (lastBackVisible === desiredBackVisible) return;
  lastBackVisible = desiredBackVisible;

  postTelegramEvent("web_app_setup_back_button", {
    is_visible: desiredBackVisible,
  });

  const wa = window.Telegram?.WebApp;
  if (!wa?.isVersionAtLeast("6.1")) return;
  if (desiredBackVisible) wa.BackButton.show();
  else wa.BackButton.hide();
}

function startAssertLoop() {
  if (assertTimer != null) {
    window.clearInterval(assertTimer);
    assertTimer = null;
  }
  if (!desiredBackVisible) return;

  let ticks = 0;
  assertTimer = window.setInterval(() => {
    lastBackVisible = null;
    syncBackButton();
    ticks += 1;
    if (ticks >= 4 && assertTimer != null) {
      window.clearInterval(assertTimer);
      assertTimer = null;
    }
  }, 250);
}

export function bindBackButtonResync() {
  if (resyncBound) return;
  const wa = window.Telegram?.WebApp;
  if (!wa) return;
  resyncBound = true;

  let timer: number | null = null;
  const resync = () => {
    if (timer != null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (desiredBackVisible) {
        lastBackVisible = null;
        syncBackButton();
      }
    }, 200);
  };

  wa.onEvent("viewportChanged", resync);
  wa.onEvent("activated", resync);
}

export function setTelegramBackButtonVisible(visible: boolean) {
  desiredBackVisible = visible;
  syncBackButton();
  if (visible) startAssertLoop();
}

export function subscribeTelegramBackButton(onBack: () => void) {
  const webView = window.Telegram?.WebView;
  const wa = window.Telegram?.WebApp;
  let locked = false;

  const handle = () => {
    if (locked) return;
    locked = true;
    window.setTimeout(() => {
      locked = false;
    }, 400);
    onBack();
  };

  webView?.onEvent("back_button_pressed", handle);
  wa?.onEvent("backButtonClicked", handle);

  return () => {
    webView?.offEvent("back_button_pressed", handle);
    wa?.offEvent("backButtonClicked", handle);
  };
}

export function navigateWhenReady(action: () => void) {
  try {
    action();
  } catch {
    requestAnimationFrame(() => {
      try {
        action();
      } catch {
        // App Router can throw before hydration in Telegram WebView.
      }
    });
  }
}
