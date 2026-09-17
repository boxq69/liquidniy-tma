"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTelegram } from "@/components/providers/telegram-provider";
import { api, apiErrorMessage } from "@/lib/api/client";
import type { SessionUser } from "@/lib/types";

type SessionState = {
  user: SessionUser | null;
  status: "loading" | "ready" | "error";
  error: string | null;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function TelegramAuthProvider({ children }: { children: ReactNode }) {
  const { isTelegram, initData } = useTelegram();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<SessionState["status"]>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { user: next } = await api.me();
    setUser(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const loadMe = async (nextStatus: SessionState["status"] = "ready") => {
      try {
        const { user: next } = await api.me();
        if (cancelled) return;
        setUser(next);
        setStatus(nextStatus);
      } catch {
        if (!cancelled) setStatus(nextStatus);
      }
    };

    if (initData) {
      void (async () => {
        try {
          const { user: next } = await api.auth(initData);
          if (cancelled) return;
          setUser(next);
          setError(null);
          setStatus("ready");
        } catch (err) {
          if (cancelled) return;
          setError(apiErrorMessage(err, "Auth failed"));
          await loadMe("error");
        }
      })();
    } else if (!isTelegram) {
      void loadMe("ready");
    } else {
      timer = window.setTimeout(() => {
        void loadMe("ready");
      }, 2500);
    }

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [isTelegram, initData]);

  const value = useMemo(
    () => ({ user, status, error, refresh }),
    [user, status, error, refresh],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within TelegramAuthProvider");
  }
  return ctx;
}
