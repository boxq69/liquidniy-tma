"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { waitForTelegramWebApp } from "@/lib/telegram/webapp-client";

type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

type TelegramState = {
  isTelegram: boolean;
  initData: string;
  startParam: string | null;
  user: TelegramUser | null;
};

const TelegramContext = createContext<TelegramState>({
  isTelegram: false,
  initData: "",
  startParam: null,
  user: null,
});

function readInitDataFromHash() {
  if (typeof window === "undefined") return "";
  try {
    const raw = sessionStorage.getItem("__telegram__initParams");
    if (!raw) return "";
    const params = JSON.parse(raw) as Record<string, string>;
    return params.tgWebAppData ?? params.initData ?? "";
  } catch {
    return "";
  }
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TelegramState>({
    isTelegram: false,
    initData: "",
    startParam: null,
    user: null,
  });

  useEffect(() => {
    let cancelled = false;

    void waitForTelegramWebApp().then((wa) => {
      if (cancelled || !wa) return;

      const fromHash = readInitDataFromHash();
      const signed = wa.initData || fromHash;
      setState({
        isTelegram: Boolean(signed) || wa.platform !== "unknown",
        initData: signed,
        startParam: wa.initDataUnsafe?.start_param ?? null,
        user: wa.initDataUnsafe?.user ?? null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => state, [state]);

  return (
    <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>
  );
}

export function useTelegram() {
  return useContext(TelegramContext);
}
